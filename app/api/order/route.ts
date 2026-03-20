import { NextResponse } from "next/server";
import { SquareClient, SquareEnvironment } from "square";
import type { CartItem } from "@/types/ordering";

const TAX_RATE = 0.0925;

function getCartTotalCents(items: CartItem[]): number {
  let subtotal = 0;
  for (const item of items) {
    const modTotal = item.modifiers?.reduce((s, m) => s + m.price, 0) ?? 0;
    subtotal += (item.price + modTotal) * item.quantity;
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
    const body = await request.json();
    const { cart, customer, fulfillment_type, token } = body as {
      cart: CartItem[];
      customer: { name: string; phone?: string; email?: string; notes?: string };
      fulfillment_type?: string;
      token: string;
    };

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Payment token is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(cart) || cart.length === 0) {
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
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const totalCents = getCartTotalCents(cart);
    if (totalCents < 1) {
      return NextResponse.json(
        { error: "Invalid order total" },
        { status: 400 }
      );
    }

    const orderType = fulfillment_type === "PICKUP" ? "PICKUP" : "PICKUP";

    const orderData = {
      cart,
      customer: { name, phone, email, notes },
      fulfillment_type: orderType,
      totalCents,
      subtotal: cart.reduce((s, i) => s + (i.price + (i.modifiers?.reduce((m, mod) => m + mod.price, 0) ?? 0)) * i.quantity, 0),
    };
    console.log("[Order]", JSON.stringify(orderData, null, 2));

    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;

    if (!accessToken || !locationId) {
      console.error("Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID");
      return NextResponse.json(
        { error: "Payment configuration error" },
        { status: 500 }
      );
    }

    const environment =
      process.env.SQUARE_ENVIRONMENT === "production"
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox;

    const client = new SquareClient({
      token: accessToken,
      environment,
    });

    const note = [
      `Customer: ${name}`,
      `Phone: ${phone}`,
      `Email: ${email}`,
      `Type: Pickup`,
      `Notes: ${notes || "None"}`,
    ].join("\n");

    const response = await client.payments.create({
      sourceId: token,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: BigInt(totalCents),
        currency: "USD",
      },
      locationId,
      autocomplete: true,
      note,
    });

    const payment = (response as { body?: { payment?: { id?: string } } }).body?.payment;
    const paymentId = payment?.id;

    if (!paymentId) {
      console.error("Square createPayment response missing payment id:", response);
      return NextResponse.json(
        { error: "Payment could not be completed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: paymentId,
    });
  } catch (err) {
    console.error("Order API error:", err);
    const message = err instanceof Error ? err.message : "Payment failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
