import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { SquareClient, SquareEnvironment } from "square";
import type { CartItem } from "@/types/ordering";
import { getEstimatedPickupTime } from "@/lib/pickupTime";
import {
  computeValidatedKitchenPickupUtc,
  getCanonicalEarliestKitchenPickupUtc,
} from "@/lib/ordering/validateFoodPickupUtc";
import { getKitchenAvailability } from "@/lib/ordering/getKitchenAvailability";
import { loadAdminSettingsFromDb } from "@/lib/server/loadAdminSettings";
import {
  insertCafeOrderAfterSuccessfulPayment,
  insertCafeOrderFreeOrder,
} from "@/lib/orders";
import {
  buildUnifiedSquareCreateOrderRequest,
  cartHasSquareCatalogBinding,
  squareMoneyAmountToCents,
} from "@/lib/squareOrderFromCart";
import { verifySquarePaymentCaptured } from "@/lib/verifySquarePayment";
import { parseUnifiedCartLines } from "@/lib/commerce/parseUnifiedCartLines";
import { reconcileCommerceOrderAfterStorefrontPayment } from "@/lib/server/reconcileCommerceCheckout";
import type { UnifiedMerchLine } from "@/types/commerce";

const TAX_RATE = 0.0925;

function getMerchSubtotalAndTaxCents(lines: UnifiedMerchLine[]): {
  subtotalCents: number;
  taxCents: number;
} {
  let sub = 0;
  for (const l of lines) {
    sub += Math.round(l.unitPrice * 100) * l.quantity;
  }
  const tax = Math.round(sub * TAX_RATE);
  return { subtotalCents: sub, taxCents: tax };
}

function parseMerchLinesOnly(
  raw: unknown
): { lines: UnifiedMerchLine[] } | { error: NextResponse } {
  if (raw === undefined) return { lines: [] };
  if (!Array.isArray(raw)) {
    return {
      error: NextResponse.json({ error: "merch_lines_invalid" }, { status: 400 }),
    };
  }
  const { lines, issues } = parseUnifiedCartLines(raw);
  if (issues.length > 0) {
    return {
      error: NextResponse.json({ error: "merch_lines_invalid", issues }, { status: 422 }),
    };
  }
  const merch: UnifiedMerchLine[] = [];
  for (const l of lines) {
    if (l.kind !== "merch") {
      return {
        error: NextResponse.json({ error: "merch_lines_only_expected" }, { status: 422 }),
      };
    }
    merch.push(l);
  }
  return { lines: merch };
}


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

/** Prefer the most actionable Square error when multiple are returned (e.g. CVV + GENERIC_DECLINE). */
function getSquareUserMessage(err: unknown): string {
  const info = squareErrorForLog(err);
  const raw = info.errors as { code?: string; detail?: string; category?: string }[] | undefined;
  const errors = Array.isArray(raw) ? raw : [];

  const byCode = new Map(errors.map((e) => [e.code, e]));

  if (byCode.has("CVV_FAILURE")) {
    return "Your card’s security code (CVV) didn’t match. Re-enter the 3 or 4 digits on the back (or front for Amex) and try again.";
  }
  if (byCode.has("INSUFFICIENT_FUNDS") || byCode.has("INSUFFICIENT_FUND")) {
    return "The card was declined for insufficient funds. Try another card or payment method.";
  }
  if (byCode.has("CARD_NOT_SUPPORTED")) {
    return "This card type isn’t accepted for this payment. Try another card.";
  }
  if (byCode.has("INVALID_EXPIRATION")) {
    return "The expiration date is invalid. Check the month/year and try again.";
  }
  if (byCode.has("INVALID_CARD")) {
    return "The card number isn’t valid. Check the number and try again.";
  }
  if (byCode.has("GENERIC_DECLINE")) {
    return "Your bank declined the payment. Try another card, verify billing details, or use Apple Pay / Google Pay if available.";
  }

  const first = errors[0];
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
 * If `cafe_orders` persistence is unavailable, we still complete Square payment
 * and return an ephemeral id (no row in your DB).
 */
function parseCustomerPickupIso(scheduledFor: string | undefined): string | null {
  if (!scheduledFor || typeof scheduledFor !== "string") return null;
  const d = new Date(scheduledFor.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Square `CreatePayment` idempotency key max length (characters). */
const SQUARE_PAYMENT_IDEMPOTENCY_KEY_MAX = 45;

/**
 * Resolves stable keys for one checkout attempt.
 * - `orderId`: returned to the client and used as `cafe_orders.id` when persisted.
 * - `squarePaymentIdempotencyKey`: passed to Square `payments.create` (retries with same key avoid duplicate charges).
 */
function resolveCheckoutCorrelationKeys(body: {
  checkoutAttemptId?: unknown;
  paymentIdempotencyKey?: unknown;
}): { orderId: string; squarePaymentIdempotencyKey: string } {
  const rawAttempt =
    typeof body.checkoutAttemptId === "string" ? body.checkoutAttemptId.trim() : "";
  const orderId = UUID_RE.test(rawAttempt) ? rawAttempt : crypto.randomUUID();

  const rawKey =
    typeof body.paymentIdempotencyKey === "string" ? body.paymentIdempotencyKey.trim() : "";
  let squarePaymentIdempotencyKey: string;
  if (rawKey.length > 0 && rawKey.length <= SQUARE_PAYMENT_IDEMPOTENCY_KEY_MAX) {
    squarePaymentIdempotencyKey = rawKey;
  } else if (orderId.length <= SQUARE_PAYMENT_IDEMPOTENCY_KEY_MAX) {
    squarePaymentIdempotencyKey = orderId;
  } else {
    squarePaymentIdempotencyKey = createHash("sha256")
      .update(orderId)
      .digest("hex")
      .slice(0, SQUARE_PAYMENT_IDEMPOTENCY_KEY_MAX);
  }
  return { orderId, squarePaymentIdempotencyKey };
}

/** Stable key for Square `orders.create` per checkout attempt (≤45 chars). */
function squareOrderCreateIdempotencyKey(checkoutCorrelationId: string): string {
  return createHash("sha256")
    .update(`square-orders-create:${checkoutCorrelationId}`)
    .digest("base64url")
    .slice(0, SQUARE_PAYMENT_IDEMPOTENCY_KEY_MAX);
}

function isUniqueViolation(err: unknown): boolean {
  const o = err as { code?: string; message?: string };
  if (o?.code === "23505") return true;
  const msg = (o?.message ?? (err instanceof Error ? err.message : String(err))).toLowerCase();
  return msg.includes("duplicate key") || msg.includes("unique constraint");
}

export async function POST(request: Request) {
  try {
    /**
     * Square surfaces used here:
     * - `OrdersApi.createOrder` — unified kitchen + shop lines, pickup fulfillment, optional `TOTAL_PHASE`
     *   shipping service charge (`buildUnifiedSquareCreateOrderRequest` in `lib/squareOrderFromCart.ts`).
     * - `PaymentsApi.createPayment` — single customer charge; `orderId` set when the itemized Square order path succeeds.
     *
     * Shipping quotes (preview): `OrdersApi.calculateOrder` in `lib/shipping/squareShippingQuote.ts` and
     * `POST /api/checkout/shipping-quote` with a `SHIPMENT` fulfillment — see that module for details.
     *
     * Square allows only one fulfillment on `orders.create`; pickup is used on the paid order while shipment
     * quotes use `calculateOrder` + ops fulfillment groups for retail shipping.
     */
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (ORDER_DEBUG) {
      console.log("[Order] REQUEST BODY:", safeJson(redactBodyForLog(body)));
    }

    const {
      cart: rawCart,
      customer,
      fulfillment_type,
      token,
      scheduledFor,
      checkoutAttemptId,
      paymentIdempotencyKey,
      merchLines: rawMerchLines,
      shippingCents: rawShippingCents,
      selectedShippingLabel,
      selectedShippingQuoteUid,
      commerceOrderId: rawCommerceOrderId,
    } = (body ?? {}) as {
      cart?: CartItem[];
      customer?: { name?: string; phone?: string; email?: string; notes?: string };
      fulfillment_type?: string;
      token?: string;
      scheduledFor?: string;
      checkoutAttemptId?: string;
      paymentIdempotencyKey?: string;
      /** Serialized `UnifiedMerchLine` rows — same shape as unified cart storage */
      merchLines?: unknown;
      /** Whole cents — from Square shipping quote selection */
      shippingCents?: number;
      selectedShippingLabel?: string;
      selectedShippingQuoteUid?: string;
      commerceOrderId?: string;
    };

    let cart: CartItem[] = Array.isArray(rawCart) ? rawCart : [];
    const merchParsed = parseMerchLinesOnly(rawMerchLines);
    if ("error" in merchParsed) return merchParsed.error;
    const merchLines = merchParsed.lines;

    const shippingCents =
      typeof rawShippingCents === "number" && Number.isFinite(rawShippingCents)
        ? Math.max(0, Math.floor(rawShippingCents))
        : 0;

    const commerceOrderId =
      typeof rawCommerceOrderId === "string" && UUID_RE.test(rawCommerceOrderId.trim())
        ? rawCommerceOrderId.trim()
        : undefined;

    const fulfillmentType = fulfillment_type === "DELIVERY" ? "DELIVERY" : "PICKUP";
    const fulfillmentLabel = fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup";

    if (cart.length === 0 && merchLines.length === 0) {
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

    if (VARIATION_DEBUG && cart.length > 0) {
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

    let foodItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
    const adminSettings = await loadAdminSettingsFromDb();

    if (foodItemCount > 0) {
      const kitchenGate = getKitchenAvailability(
        new Date(),
        adminSettings.weeklyHours,
        adminSettings.orderingRules,
        foodItemCount,
        { isOrderingOpen: adminSettings.isOrderingOpen }
      );
      if (!kitchenGate.foodOrderingLive) {
        if (merchLines.length === 0) {
          console.warn("[Order] 422: Kitchen food ordering unavailable (window or Ops gate)");
          return NextResponse.json(
            {
              error:
                "The kitchen isn’t accepting online food orders in this window. Refresh checkout, remove kitchen items, or finish shop-only checkout.",
              code: "kitchen_food_unavailable",
            },
            { status: 422 }
          );
        }
        console.warn("[Order] Stripping kitchen cart — food window closed; continuing with shop lines only.");
        cart = [];
        foodItemCount = 0;
      }
    }

    let estimatedPickupAt = getEstimatedPickupTime(foodItemCount > 0 ? foodItemCount : 1);

    /** Kitchen pickup instant — anchored to Ops windows + validated client `scheduledFor` */
    let kitchenPickupAtUtc: Date | null = null;

    if (foodItemCount > 0) {
      const canon = getCanonicalEarliestKitchenPickupUtc(
        new Date(),
        adminSettings.weeklyHours,
        adminSettings.orderingRules,
        foodItemCount
      );
      if (!canon) {
        console.warn("[Order] 422: Kitchen pickup unavailable for current Ops schedule");
        return NextResponse.json(
          {
            error:
              "Kitchen pickup isn’t schedulable with current hours/rules. Refresh checkout or tweak Ops pickup windows.",
          },
          { status: 422 }
        );
      }
      const resolved = computeValidatedKitchenPickupUtc({
        nowUtc: new Date(),
        scheduledForIso: scheduledFor,
        weeklyHours: adminSettings.weeklyHours,
        orderingRulesPartial: adminSettings.orderingRules,
        foodItemCount,
      });
      kitchenPickupAtUtc = resolved.pickupUtc;
      estimatedPickupAt = kitchenPickupAtUtc;
    }

    const { orderId, squarePaymentIdempotencyKey } = resolveCheckoutCorrelationKeys({
      checkoutAttemptId,
      paymentIdempotencyKey,
    });

    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;
    const environmentRaw = process.env.SQUARE_ENVIRONMENT;
    const isProduction = environmentRaw === "production";
    const squareEnvironment = isProduction
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox;

    const hasAnyLine = cart.length > 0 || merchLines.length > 0;
    const foodCatalogOk = cart.length === 0 || cartHasSquareCatalogBinding(cart);
    const canUseSquareOrders = Boolean(accessToken && locationId) && hasAnyLine && foodCatalogOk;

    let squareOrderId: string | undefined;
    /** Payment amount must match Square order total when paying for an order. */
    let paymentAmountBigInt: bigint;
    let totalCents: number;

    const { subtotalCents: merchSubtotalCents, taxCents: merchTaxCents } =
      getMerchSubtotalAndTaxCents(merchLines);

    const shippingLabelNormalized =
      typeof selectedShippingLabel === "string" && selectedShippingLabel.trim().length > 0
        ? selectedShippingLabel.trim().slice(0, 120)
        : undefined;
    const shippingQuoteUidNormalized =
      typeof selectedShippingQuoteUid === "string" && selectedShippingQuoteUid.trim().length > 0
        ? selectedShippingQuoteUid.trim().slice(0, 120)
        : undefined;

    if (canUseSquareOrders) {
      const squareClient = new SquareClient({
        token: accessToken!,
        environment: squareEnvironment,
      });
      const squareOrdersCreateKey = squareOrderCreateIdempotencyKey(orderId);
      const pickupAtIso =
        foodItemCount > 0 && kitchenPickupAtUtc
          ? kitchenPickupAtUtc.toISOString()
          : (parseCustomerPickupIso(scheduledFor) ?? estimatedPickupAt.toISOString());
      const squareReq = buildUnifiedSquareCreateOrderRequest({
        locationId: locationId!,
        foodCart: cart,
        merchLines,
        idempotencyKey: squareOrdersCreateKey,
        referenceId: orderId,
        pickup: {
          pickupAtIso,
          scheduleType: "SCHEDULED",
          recipientDisplayName: name,
          recipientPhone: phone,
          recipientEmail: email,
          pickupNote:
            [
              notes && `Note: ${notes}`,
              merchLines.length > 0 ? `Includes ${merchLines.length} shop line(s).` : "",
            ]
              .filter(Boolean)
              .join(" ")
              .slice(0, 500) || undefined,
        },
        shippingServiceCharge:
          shippingCents > 0
            ? { cents: shippingCents, name: shippingLabelNormalized ?? "Shipping" }
            : undefined,
      });

      if (SQUARE_ORDER_LOG) {
        console.log("SQUARE ORDER PAYLOAD:", safeJson(squareReq));
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
      totalCents = getCartTotalCents(cart) + merchSubtotalCents + merchTaxCents + shippingCents;
      if (totalCents < 0) {
        return NextResponse.json({ error: "Invalid order total" }, { status: 400 });
      }
      paymentAmountBigInt = BigInt(totalCents);
    }

    const skipPersistEnv =
      process.env.SKIP_CAFE_ORDER_PERSIST === "1" ||
      process.env.SKIP_CAFE_ORDER_PERSIST === "true";
    const persistOrdersToDb = !skipPersistEnv;

    if (skipPersistEnv) {
      console.warn(
        "[Order] SKIP_CAFE_ORDER_PERSIST is set — payments proceed; orders are not saved to PostgreSQL."
      );
    }

    if (ORDER_DEBUG) {
      console.log(
        "[Order] Checkout correlation:",
        "orderId:",
        orderId,
        "totalCents:",
        totalCents,
        "squareOrderId:",
        squareOrderId ?? "(none — legacy payment)",
        "persistToDb:",
        persistOrdersToDb
      );
    }

    const customerPayload = { name, phone, email, notes: notes || undefined };
    const estimatedPickupAtIso = estimatedPickupAt.toISOString();
    const scheduledForIso =
      foodItemCount > 0 ? estimatedPickupAtIso : parseCustomerPickupIso(scheduledFor);

    if (totalCents === 0) {
      let persistedToDatabase = false;
      if (persistOrdersToDb && cart.length > 0) {
        try {
          await insertCafeOrderFreeOrder({
            id: orderId,
            cart,
            customer: customerPayload,
            totalCents: 0,
            fulfillmentType,
            scheduledForIso,
            estimatedPickupAtIso,
            squareOrderId: squareOrderId ?? null,
          });
          persistedToDatabase = true;
          console.log("[Order] DB insert success (free order)", orderId);
        } catch (insertErr) {
          if (isUniqueViolation(insertErr)) {
            persistedToDatabase = true;
            console.log("[Order] DB insert skipped — free order row already exists (idempotent retry)", orderId);
          } else {
            console.error(
              "[Order] CRITICAL: Free order checkout succeeded but DB persistence failed",
              orderId,
              safeJson(squareErrorForLog(insertErr))
            );
          }
        }
      } else if (persistOrdersToDb && cart.length === 0) {
        persistedToDatabase = true;
      }
      return NextResponse.json({
        success: true,
        orderId,
        isFreeOrder: true,
        message: "Order placed successfully (no charge)",
        paymentVerified: true,
        freeOrder: true,
        persistedToDatabase,
      });
    }

    if (!token || typeof token !== "string") {
      console.warn("[Order] 400: Missing payment token", orderId);
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

    const idempotencyKey = squarePaymentIdempotencyKey;

    console.log("[Order] Payment started", {
      orderId,
      totalCents,
      squareOrderId: squareOrderId ?? null,
    });
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
      console.error("[Order] Payment failure", {
        orderId,
        error: safeJson(squareErrorForLog(squareErr)),
      });
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
      console.error("[Order] Payment failure: createPayment response missing payment id", orderId);
      return NextResponse.json(
        { error: "Payment could not be completed", orderId },
        { status: 500 }
      );
    }

    console.log("[Order] Payment success (Square createPayment response)", { orderId, paymentId });

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
        console.error("[Order] Payment failure (verification)", {
          orderId,
          paymentId,
          detail: verified,
        });
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

    console.log("[Order] Payment success (verified or skipped verify)", {
      orderId,
      paymentId,
      paymentVerified,
    });

    let persistedToDatabase = false;
    if (persistOrdersToDb) {
      if (cart.length > 0) {
        try {
          await insertCafeOrderAfterSuccessfulPayment({
            id: orderId,
            cart,
            customer: customerPayload,
            totalCents,
            fulfillmentType,
            scheduledForIso,
            estimatedPickupAtIso,
            squareOrderId: squareOrderId ?? null,
            squarePaymentId: paymentId,
          });
          persistedToDatabase = true;
          console.log("[Order] DB insert success after payment", orderId);
        } catch (insertErr) {
          if (isUniqueViolation(insertErr)) {
            persistedToDatabase = true;
            console.log(
              "[Order] DB insert skipped — paid row already exists (idempotent retry)",
              orderId
            );
          } else {
            console.error(
              "[Order] CRITICAL: Payment succeeded but DB persistence failed",
              { orderId, paymentId, error: insertErr instanceof Error ? insertErr.message : String(insertErr) }
            );
          }
        }
      } else {
        persistedToDatabase = true;
      }

      if (commerceOrderId) {
        try {
          await reconcileCommerceOrderAfterStorefrontPayment({
            commerceOrderId,
            squarePaymentId: paymentId,
            paidTotalCents: totalCents,
            shipping:
              shippingCents > 0
                ? {
                    cents: shippingCents,
                    label: shippingLabelNormalized,
                    quoteUid: shippingQuoteUidNormalized,
                  }
                : null,
          });
        } catch (commerceErr) {
          console.error("[Order] Commerce order reconcile failed", {
            commerceOrderId,
            paymentId,
            error: commerceErr instanceof Error ? commerceErr.message : String(commerceErr),
          });
        }
      }
    }

    if (ORDER_DEBUG) {
      console.log("[Order] Checkout complete", orderId, paymentId, "persisted:", persistedToDatabase);
    }

    return NextResponse.json({
      success: true,
      orderId,
      squarePaymentId: paymentId,
      squarePaymentStatus,
      paymentVerified: skipVerify ? false : paymentVerified,
      ...(receiptNumber ? { receiptNumber } : {}),
      ...(squareOrderId ? { squareOrderId } : {}),
      persistedToDatabase,
    });
  } catch (err: unknown) {
    console.error("[Order] Unexpected error:", safeJson(squareErrorForLog(err)));
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
