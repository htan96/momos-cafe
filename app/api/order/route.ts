import { NextResponse } from "next/server";
import { SquareClient, SquareEnvironment } from "square";
import type { CartItem } from "@/types/ordering";

const TAX_RATE = 0.0925;

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

    const { cart, customer, fulfillment_type, token } = (body ?? {}) as {
      cart?: CartItem[];
      customer?: { name?: string; phone?: string; email?: string; notes?: string };
      fulfillment_type?: string;
      token?: string;
    };

    const fulfillmentLabel =
      fulfillment_type === "DELIVERY" ? "Delivery" : "Pickup";

    if (!token || typeof token !== "string") {
      console.warn("[Order] 400: Missing or invalid payment token");
      return NextResponse.json(
        { error: "Payment token is required. Please complete the card form." },
        { status: 400 }
      );
    }

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
    if (totalCents < 1) {
      console.warn("[Order] 400: Invalid order total", { totalCents, cartLength: cart.length });
      return NextResponse.json(
        { error: "Invalid order total" },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[Order] totalCents:", totalCents, "cartItems:", cart.length);
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

    if (process.env.NODE_ENV === "development") {
      console.log("[Order] Square env:", environmentRaw, "locationId:", locationId);
    }

    const paymentPayload = {
      sourceId: token,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: { amount: BigInt(totalCents), currency: "USD" as const },
      locationId,
      autocomplete: true,
      note: `Customer: ${name}\nPhone: ${phone}\nEmail: ${email}\nType: ${fulfillmentLabel}\nNotes: ${notes || "None"}`,
    };

    const client = new SquareClient({
      token: accessToken,
      environment,
    });

    const response = await client.payments.create(paymentPayload);
    const res = response as { payment?: { id?: string }; body?: { payment?: { id?: string } } };
    const payment = res.payment ?? res.body?.payment;
    const paymentId = payment?.id;

    if (!paymentId) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Order] createPayment missing payment id; response keys:", Object.keys(res ?? {}));
      } else {
        console.error("[Order] createPayment missing payment id");
      }
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
    const e = err as { errors?: unknown[]; body?: { errors?: unknown[] } };
    const squareErrors = e?.errors ?? e?.body?.errors;
    const firstError = Array.isArray(squareErrors) ? (squareErrors[0] as { code?: string; detail?: string; field?: string }) : null;
    const code = firstError?.code ?? "";
    const detail = firstError?.detail ?? "";
    const field = firstError?.field ?? "";

    if (process.env.NODE_ENV === "development") {
      console.error("[Order] Square API error", { code, detail, field });
    } else {
      console.error("[Order] Square API error", code, detail);
    }

    let userMessage = "Payment failed. Please try again.";
    if (code === "NOT_FOUND" || detail?.toLowerCase().includes("not found")) {
      userMessage =
        "Square location or token mismatch. Ensure SQUARE_LOCATION_ID matches your Square Dashboard, SQUARE_ENVIRONMENT (sandbox/production) matches your credentials, and SQUARE_ACCESS_TOKEN is from the same application.";
    } else if (detail) {
      userMessage = detail;
    } else if (err instanceof Error) {
      userMessage = err.message;
    }

    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
