import { NextResponse } from "next/server";
import { SquareClient, SquareEnvironment } from "square";
import type { CartItem } from "@/types/ordering";
import { getEstimatedPickupTime } from "@/lib/pickupTime";
import {
  createCafeOrder,
  markCafeOrderPaid,
  markCafeOrderPaymentFailed,
} from "@/lib/orders";
import {
  buildSquareCreateOrderRequest,
  cartHasSquareCatalogBinding,
  squareMoneyAmountToCents,
} from "@/lib/squareOrderFromCart";
import { verifySquarePaymentCaptured } from "@/lib/verifySquarePayment";

const TAX_RATE = 0.0925;

const ORDER_DEBUG =
  process.env.NODE_ENV === "development" || process.env.ORDER_DEBUG_LOGS === "1";

/** Set `VARIATION_DEBUG_LOGS=1` to log cart variation IDs in production without full order debug. */
const VARIATION_DEBUG =
  ORDER_DEBUG || process.env.VARIATION_DEBUG_LOGS === "1";

/** Logs full `orders.create` request/response (PII: customer name/phone/email in fulfillment). */
const SQUARE_ORDER_LOG =
  ORDER_DEBUG || process.env.SQUARE_ORDER_PAYLOAD_LOGS === "1";

function redactBodyForLog(b: unknown): unknown {
  if (!b || typeof b !== "object") return b;
  const o = { ...(b as Record<string, unknown>) };
  if (typeof o.token === "string") {
    o.token = `[REDACTED length=${o.token.length}]`;
  }
  return o;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(
      value,
      (_, v) => (typeof v === "bigint" ? v.toString() : v),
      2
    );
  } catch {
    return String(value);
  }
}

function squareErrorForLog(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    const e = err as Error & {
      statusCode?: number;
      body?: { errors?: unknown[] };
      errors?: unknown[];
    };
    return {
      name: e.name,
      message: e.message,
      statusCode: e.statusCode,
      body: e.body,
      errors: e.body?.errors ?? e.errors,
    };
  }
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    return {
      ...o,
      body: o.body,
      errors: (o.body as { errors?: unknown[] })?.errors ?? o.errors,
    };
  }
  return { value: String(err) };
}

function getSquareUserMessage(err: unknown): string {
  const info = squareErrorForLog(err);
  const errors = info.errors as { code?: string; detail?: string }[] | undefined;
  const first = Array.isArray(errors) ? errors[0] : null;
  return (
    first?.detail ??
    (err instanceof Error ? err.message : "Payment failed. Please try again.")
  );
}

function getSquareErrorPayload(err: unknown): { code?: string; detail?: string; field?: string }[] {
  const info = squareErrorForLog(err);
  const raw = info.errors as { code?: string; detail?: string; field?: string }[] | undefined;
  return Array.isArray(raw) ? raw : [];
}

function getCartTotalCents(items: CartItem[]): number {
  let subtotal = 0;
  for (const item of items) {
    const price = Number(item.price) || 0;
    const modTotal = item.modifiers?.reduce((s, m) => s + (Number(m.price) || 0), 0) ?? 0;
    subtotal += (price + modTotal) * (item.quantity || 1);
  }
  const tax = subtotal * TAX_RATE;
  return Math.round((subtotal + tax) * 100);
}

/** Unwrap Square SDK `orders.create` / `payments.create` response shapes. */
function unwrapSquareOrder(
  result: unknown
): { id?: string; totalMoney?: { amount?: bigint | string | number } } | undefined {
  if (!result || typeof result !== "object") return undefined;
  const r = result as Record<string, unknown>;
  const order =
    (r.order as Record<string, unknown> | undefined) ??
    ((r.body as Record<string, unknown> | undefined)?.order as Record<string, unknown> | undefined);
  if (!order || typeof order !== "object") return undefined;
  return order as { id?: string; totalMoney?: { amount?: bigint | string | number } };
}

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Supabase/PostgREST when `cafe_orders` was never migrated.
 * In that case we still complete Square payment and return an ephemeral id (no row in your DB).
 */
function parseCustomerPickupIso(scheduledFor: string | undefined): string | null {
  if (!scheduledFor || typeof scheduledFor !== "string") return null;
  const d = new Date(scheduledFor.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function isMissingCafeOrdersTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (!lower.includes("cafe_orders")) return false;
  return (
    lower.includes("pgrst205") ||
    lower.includes("schema cache") ||
    lower.includes("could not find the table") ||
    lower.includes("does not exist")
  );
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (ORDER_DEBUG) {
      console.log("[Order] REQUEST BODY:", safeJson(redactBodyForLog(body)));
    }

    const { cart, customer, fulfillment_type, token, scheduledFor } = (body ?? {}) as {
      cart?: CartItem[];
      customer?: { name?: string; phone?: string; email?: string; notes?: string };
      fulfillment_type?: string;
      token?: string;
      /** ISO 8601 — optional customer-chosen pickup time (stored with status `scheduled`) */
      scheduledFor?: string;
    };

    const fulfillmentType = fulfillment_type === "DELIVERY" ? "DELIVERY" : "PICKUP";
    const fulfillmentLabel = fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup";

    if (!Array.isArray(cart) || cart.length === 0) {
      console.warn("[Order] 400: Empty cart");
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const name = customer?.name?.trim() ?? "";
    const phone = customer?.phone?.trim() ?? "";
    const email = customer?.email?.trim() ?? "";
    const notes = customer?.notes?.trim() ?? "";

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: "Invalid phone number (need at least 10 digits)" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (VARIATION_DEBUG) {
      const variationRows = cart.map((item) => ({
        name: item.name,
        id: item.id,
        variationId: item.variationId,
      }));
      console.log("VARIATION CHECK:", variationRows);
      const withVariationId = variationRows.filter((r) => r.variationId);
      const withoutVariationId = variationRows.filter((r) => !r.variationId);
      console.log("VARIATION: items WITH variationId:", withVariationId.length, withVariationId);
      console.log("VARIATION: items WITHOUT variationId:", withoutVariationId.length, withoutVariationId);
    }

    const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
    const estimatedPickupAt = getEstimatedPickupTime(itemCount);

    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;
    const environmentRaw = process.env.SQUARE_ENVIRONMENT;
    const isProduction = environmentRaw === "production";
    const squareEnvironment = isProduction
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox;

    const canUseSquareOrders =
      Boolean(accessToken && locationId) && cartHasSquareCatalogBinding(cart);

    let squareOrderId: string | undefined;
    /** Payment amount must match Square order total when paying for an order. */
    let paymentAmountBigInt: bigint;
    let totalCents: number;

    if (canUseSquareOrders) {
      const squareClient = new SquareClient({
        token: accessToken!,
        environment: squareEnvironment,
      });
      const orderIdempotencyKey = crypto.randomUUID();
      const customerPickupIso = parseCustomerPickupIso(scheduledFor);
      const pickupAtIso = customerPickupIso ?? estimatedPickupAt.toISOString();
      const squareReq = buildSquareCreateOrderRequest({
        locationId: locationId!,
        cart,
        idempotencyKey: orderIdempotencyKey,
        referenceId: crypto.randomUUID(),
        pickup: {
          pickupAtIso,
          scheduleType: "SCHEDULED",
          recipientDisplayName: name,
          recipientPhone: phone,
          recipientEmail: email,
          pickupNote:
            [notes && `Note: ${notes}`].filter(Boolean).join(" ").slice(0, 500) || undefined,
        },
      });

      const orderPayload = squareReq;
      if (SQUARE_ORDER_LOG) {
        console.log("SQUARE ORDER PAYLOAD:", safeJson(orderPayload));
      }

      let squareOrderResp: unknown;
      try {
        squareOrderResp = await squareClient.orders.create(squareReq);
        if (SQUARE_ORDER_LOG) {
          console.log("SQUARE ORDER RESPONSE:", safeJson(squareOrderResp));
        }
      } catch (squareErr: unknown) {
        console.error("[Order] Square orders.create failed:", safeJson(squareErrorForLog(squareErr)));
        const userMessage = getSquareUserMessage(squareErr);
        return NextResponse.json(
          {
            error: userMessage || "Could not create order with Square. Try again or clear your cart.",
            squareErrors: ORDER_DEBUG ? getSquareErrorPayload(squareErr) : undefined,
          },
          { status: 400 }
        );
      }

      const squareOrder = unwrapSquareOrder(squareOrderResp);
      const sid = squareOrder?.id;
      const tm = squareOrder?.totalMoney?.amount;
      if (!sid || tm === undefined || tm === null) {
        console.error("[Order] Square orders.create missing id/totalMoney", safeJson(squareOrderResp));
        return NextResponse.json(
          { error: "Square order response was incomplete. Please try again." },
          { status: 502 }
        );
      }

      paymentAmountBigInt = typeof tm === "bigint" ? tm : BigInt(String(tm));
      totalCents = squareMoneyAmountToCents(paymentAmountBigInt);
      squareOrderId = sid;

      if (totalCents < 0) {
        return NextResponse.json({ error: "Invalid order total" }, { status: 400 });
      }
    } else {
      totalCents = getCartTotalCents(cart);
      if (totalCents < 0) {
        return NextResponse.json({ error: "Invalid order total" }, { status: 400 });
      }
      paymentAmountBigInt = BigInt(totalCents);
    }

    /** When false, no `cafe_orders` row — Square is still charged; id is ephemeral (UUID). */
    let persistOrdersToDb = true;
    const skipPersistEnv =
      process.env.SKIP_CAFE_ORDER_PERSIST === "1" ||
      process.env.SKIP_CAFE_ORDER_PERSIST === "true";

    let orderId: string;
    if (skipPersistEnv) {
      persistOrdersToDb = false;
      orderId = crypto.randomUUID();
      console.warn(
        "[Order] SKIP_CAFE_ORDER_PERSIST is set — checkout works via Square only; orders are not saved to Supabase."
      );
    } else {
      try {
        const created = await createCafeOrder({
          cart,
          customer: { name, phone, email, notes: notes || undefined },
          totalCents,
          fulfillmentType,
          scheduledForIso: scheduledFor ?? null,
          estimatedPickupAtIso: estimatedPickupAt.toISOString(),
          squareOrderId: squareOrderId ?? null,
        });
        orderId = created.id;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Order storage failed";
        const lower = msg.toLowerCase();
        const isConfig =
          msg.includes("SUPABASE") ||
          msg.includes("SERVICE_ROLE") ||
          msg.includes("NEXT_PUBLIC_SUPABASE");

        if (isMissingCafeOrdersTable(e)) {
          persistOrdersToDb = false;
          orderId = crypto.randomUUID();
          console.warn(
            "[Order] public.cafe_orders missing — continuing with Square-only checkout. Ephemeral order id:",
            orderId,
            "Run supabase/migrations for cafe_orders if you want orders in your database."
          );
        } else {
          /** Other DB/schema issues */
          const isSchema =
            lower.includes("cafe_orders") ||
            lower.includes("square_order_id") ||
            lower.includes("does not exist") ||
            lower.includes("relation") ||
            lower.includes("schema cache");
          console.error("[Order] createCafeOrder failed:", msg);
          let error =
            "Could not save your order. Please try again or call the restaurant.";
          if (isConfig) {
            error =
              "Order system not configured on server. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to hosting env (e.g. Vercel), then redeploy.";
          } else if (isSchema) {
            error =
              "Database not ready: run Supabase SQL migrations for table cafe_orders (including square_order_id if you use Square Orders).";
          } else if (process.env.NODE_ENV === "development" || process.env.ORDER_DEBUG_LOGS === "1") {
            error = msg;
          }
          return NextResponse.json(
            { error, detail: process.env.ORDER_DEBUG_LOGS === "1" ? msg : undefined },
            { status: 503 }
          );
        }
      }
    }

    if (ORDER_DEBUG) {
      console.log(
        persistOrdersToDb ? "[Order] Created cafe_orders row:" : "[Order] Ephemeral order (no DB row):",
        orderId,
        "totalCents:",
        totalCents,
        "squareOrderId:",
        squareOrderId ?? "(none — legacy payment)"
      );
    }

    if (totalCents === 0) {
      return NextResponse.json({
        success: true,
        orderId,
        isFreeOrder: true,
        message: "Order placed successfully (no charge)",
        paymentVerified: true,
        freeOrder: true,
      });
    }

    if (!token || typeof token !== "string") {
      console.warn(
        "[Order] 400: Missing payment token",
        orderId,
        persistOrdersToDb ? "(cafe_orders row may be awaiting_payment)" : "(Square-only mode)"
      );
      return NextResponse.json(
        { error: "Payment token is required. Please complete the card form.", orderId },
        { status: 400 }
      );
    }

    if (!accessToken || !locationId) {
      console.error("[Order] Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID", orderId);
      return NextResponse.json(
        { error: "Payment configuration error", orderId },
        { status: 500 }
      );
    }

    const idempotencyKey = crypto.randomUUID();
    const paymentPayload: {
      sourceId: string;
      idempotencyKey: string;
      amountMoney: { amount: bigint; currency: "USD" };
      locationId: string;
      orderId?: string;
      autocomplete: boolean;
      note: string;
    } = {
      sourceId: token,
      idempotencyKey,
      amountMoney: { amount: paymentAmountBigInt, currency: "USD" },
      locationId,
      autocomplete: true,
      note: `Order ${orderId}\nCustomer: ${name}\nPhone: ${phone}\nEmail: ${email}\nType: ${fulfillmentLabel}\nNotes: ${notes || "None"}`,
    };
    if (squareOrderId) {
      paymentPayload.orderId = squareOrderId;
    }

    if (ORDER_DEBUG) {
      console.log(
        "[Order] PAYMENT REQUEST:",
        safeJson({
          cafeOrderId: orderId,
          squareOrderId: squareOrderId ?? null,
          sourceId: `${token.slice(0, 12)}... (len ${token.length})`,
          idempotencyKey,
          amountMoney: { amount: paymentAmountBigInt.toString(), currency: "USD" },
          locationId,
        })
      );
    }

    const client = new SquareClient({
      token: accessToken,
      environment: squareEnvironment,
    });

    let response: unknown;
    try {
      response = await client.payments.create(paymentPayload);
    } catch (squareErr: unknown) {
      console.error("[Order] SQUARE ERROR:", safeJson(squareErrorForLog(squareErr)));
      if (persistOrdersToDb) {
        await markCafeOrderPaymentFailed(orderId).catch(() => {});
      }
      const userMessage = getSquareUserMessage(squareErr);
      const payload: { error: string; orderId: string; squareErrors?: unknown } = {
        error: userMessage,
        orderId,
      };
      if (ORDER_DEBUG) {
        payload.squareErrors = getSquareErrorPayload(squareErr);
      }
      return NextResponse.json(payload, { status: 400 });
    }

    const res = response as {
      payment?: { id?: string; status?: string; amountMoney?: { amount?: bigint } };
      body?: { payment?: { id?: string; status?: string; amountMoney?: { amount?: bigint } } };
    };
    const payment = res.payment ?? res.body?.payment;
    const paymentId = payment?.id;

    if (!paymentId) {
      if (persistOrdersToDb) {
        await markCafeOrderPaymentFailed(orderId).catch(() => {});
      }
      console.error("[Order] createPayment missing payment id", orderId);
      return NextResponse.json(
        { error: "Payment could not be completed", orderId },
        { status: 500 }
      );
    }

    const skipVerify =
      process.env.SKIP_PAYMENT_VERIFICATION === "1" ||
      process.env.SKIP_PAYMENT_VERIFICATION === "true";

    let squarePaymentStatus = payment?.status ?? "UNKNOWN";
    let receiptNumber: string | undefined;
    let paymentVerified = false;

    if (skipVerify) {
      paymentVerified = false;
      console.warn("[Order] SKIP_PAYMENT_VERIFICATION: not calling payments.get() to confirm charge.");
    } else {
      const verified = await verifySquarePaymentCaptured(client, paymentId, paymentAmountBigInt);
      if (!verified.ok) {
        console.error("[Order] Payment verification failed:", verified, "paymentId:", paymentId);
        if (persistOrdersToDb) {
          await markCafeOrderPaymentFailed(orderId).catch(() => {});
        }
        return NextResponse.json(
          {
            error:
              "We could not confirm your payment with Square. If you see a charge, contact the restaurant with this payment reference.",
            orderId,
            squarePaymentId: paymentId,
            verificationFailed: true,
            verificationDetail: verified.reason,
          },
          { status: 502 }
        );
      }
      squarePaymentStatus = verified.status;
      receiptNumber = verified.receiptNumber;
      paymentVerified = true;
    }

    if (persistOrdersToDb) {
      try {
        await markCafeOrderPaid(orderId, paymentId);
      } catch (updateErr) {
        console.error("[Order] CRITICAL: Square paid but DB update failed", orderId, paymentId, updateErr);
      }
    }

    if (ORDER_DEBUG) {
      console.log("[Order] PAYMENT SUCCESS:", orderId, paymentId, "verified:", paymentVerified);
    }

    return NextResponse.json({
      success: true,
      orderId,
      squarePaymentId: paymentId,
      squarePaymentStatus,
      paymentVerified: skipVerify ? false : paymentVerified,
      ...(receiptNumber ? { receiptNumber } : {}),
      ...(squareOrderId ? { squareOrderId } : {}),
      ...(persistOrdersToDb ? {} : { persistedToDatabase: false }),
    });
  } catch (err: unknown) {
    console.error("[Order] Unexpected error:", safeJson(squareErrorForLog(err)));
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
