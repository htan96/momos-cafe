import { NextResponse } from "next/server";
import { SquareClient, SquareEnvironment } from "square";
import type { CartItem } from "@/types/ordering";

const TAX_RATE = 0.0925;

/** Enable verbose /api/order logs (redacts token in body dump; still logs token prefix). */
const ORDER_DEBUG =
  process.env.NODE_ENV === "development" || process.env.ORDER_DEBUG_LOGS === "1";

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

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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

    const { cart, customer, fulfillment_type, token } = (body ?? {}) as {
      cart?: CartItem[];
      customer?: { name?: string; phone?: string; email?: string; notes?: string };
      fulfillment_type?: string;
      token?: string;
    };

    const fulfillmentLabel =
      fulfillment_type === "DELIVERY" ? "Delivery" : "Pickup";

    if (!Array.isArray(cart) || cart.length === 0) {
      console.warn("[Order] 400: Empty cart");
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
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

    const totalCents = getCartTotalCents(cart);
    if (totalCents < 0) {
      return NextResponse.json({ error: "Invalid order total" }, { status: 400 });
    }

    if (totalCents === 0) {
      const freeOrderId = `free-${crypto.randomUUID().replace(/-/g, "")}`;
      if (ORDER_DEBUG) {
        console.log("[Order] Free order (no Square charge)", { freeOrderId, cartItems: cart.length });
      }
      return NextResponse.json({
        success: true,
        isFreeOrder: true,
        message: "Order placed successfully (no charge)",
        orderId: freeOrderId,
      });
    }

    if (!token || typeof token !== "string") {
      console.warn("[Order] 400: Missing or invalid payment token");
      if (ORDER_DEBUG) {
        console.log("[Order] TOKEN:", token === undefined ? "undefined" : typeof token);
      }
      return NextResponse.json(
        { error: "Payment token is required. Please complete the card form." },
        { status: 400 }
      );
    }

    if (ORDER_DEBUG) {
      console.log(
        "[Order] TOKEN:",
        `${token.slice(0, 12)}...`,
        "length:",
        token.length,
        "(full token only in browser/Square; never log complete token)"
      );
      console.log("[Order] TOTAL CENTS:", totalCents);
    }

    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;
    const environmentRaw = process.env.SQUARE_ENVIRONMENT;
    const isProduction = environmentRaw === "production";
    const environment = isProduction ? SquareEnvironment.Production : SquareEnvironment.Sandbox;

    if (!accessToken || !locationId) {
      console.error("[Order] Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID");
      return NextResponse.json(
        { error: "Payment configuration error" },
        { status: 500 }
      );
    }

    const idempotencyKey = crypto.randomUUID();
    const paymentPayload = {
      sourceId: token,
      idempotencyKey,
      amountMoney: { amount: BigInt(totalCents), currency: "USD" as const },
      locationId,
      autocomplete: true,
      note: `Customer: ${name}\nPhone: ${phone}\nEmail: ${email}\nType: ${fulfillmentLabel}\nNotes: ${notes || "None"}`,
    };

    if (ORDER_DEBUG) {
      console.log(
        "[Order] PAYMENT REQUEST:",
        safeJson({
          sourceId: `${token.slice(0, 12)}... (len ${token.length})`,
          idempotencyKey,
          amountMoney: { amount: totalCents, currency: "USD" },
          locationId,
        })
      );
    }

    const client = new SquareClient({
      token: accessToken,
      environment,
    });

    let response: unknown;
    try {
      response = await client.payments.create(paymentPayload);
    } catch (squareErr: unknown) {
      console.error("[Order] SQUARE ERROR:", safeJson(squareErrorForLog(squareErr)));
      const userMessage = getSquareUserMessage(squareErr);
      const payload: { error: string; squareErrors?: unknown } = { error: userMessage };
      if (ORDER_DEBUG) {
        payload.squareErrors = getSquareErrorPayload(squareErr);
      }
      return NextResponse.json(payload, { status: 400 });
    }

    const res = response as { payment?: { id?: string }; body?: { payment?: { id?: string } } };
    const payment = res.payment ?? res.body?.payment;
    const paymentId = payment?.id;

    if (ORDER_DEBUG) {
      console.log(
        "[Order] PAYMENT SUCCESS:",
        safeJson({
          paymentId: paymentId ?? null,
          responseKeys: res && typeof res === "object" ? Object.keys(res) : [],
        })
      );
    }

    if (!paymentId) {
      console.error("[Order] createPayment missing payment id");
      return NextResponse.json(
        { error: "Payment could not be completed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: paymentId,
    });
  } catch (err: unknown) {
    console.error("[Order] Unexpected error:", safeJson(squareErrorForLog(err)));
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
