import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server/apiErrors";
import { rateLimitHit, clientIp } from "@/lib/server/rateLimitMemory";
import { registerPendingCommercePayment } from "@/lib/payments/commercePaymentOrchestration";

/** Registers (idempotent) pending Square-backed payment shell for a commerce order */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (rateLimitHit(`payments:start:${ip}`, { windowMs: 60_000, max: 40 })) {
    return jsonError(429, "RATE_LIMITED", "Too many requests");
  }

  let body: { commerceOrderId?: string; idempotencyKey?: string; amountCents?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError(400, "INVALID_JSON", "Expected JSON body");
  }

  const commerceOrderId = body.commerceOrderId?.trim();
  const idempotencyKey = body.idempotencyKey?.trim();
  if (!commerceOrderId || !idempotencyKey) {
    return jsonError(400, "VALIDATION_ERROR", "commerceOrderId and idempotencyKey required");
  }

  try {
    const result = await registerPendingCommercePayment({
      commerceOrderId,
      idempotencyKey,
      amountCents: body.amountCents,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    if (msg === "ORDER_NOT_FOUND") return jsonError(404, "ORDER_NOT_FOUND", "Order not found");
    if (msg === "AMOUNT_MISMATCH") return jsonError(422, "AMOUNT_MISMATCH", "amountCents must match order total");
    if (msg.startsWith("ORDER_TRANSITION_BLOCKED")) {
      return jsonError(422, "ORDER_TRANSITION_BLOCKED", msg);
    }
    if (msg.startsWith("ORDER_NOT_PAYABLE")) {
      return jsonError(422, "ORDER_NOT_PAYABLE", msg);
    }
    if (msg === "IDEMPOTENCY_KEY_ORDER_MISMATCH") {
      return jsonError(409, "IDEMPOTENCY_KEY_ORDER_MISMATCH", "Key already used for another order");
    }
    console.error("[payments/start POST]", e);
    return jsonError(500, "PAYMENT_REGISTER_FAILED", "Could not register payment");
  }
}
