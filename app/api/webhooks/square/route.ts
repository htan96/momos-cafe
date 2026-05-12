import { NextResponse } from "next/server";
import { WebhooksHelper } from "square";
import { reconcileSquarePaymentWebhook } from "@/lib/payments/commercePaymentOrchestration";

export const runtime = "nodejs";

/**
 * Square merchant webhook — verifies HMAC before touching payments / orders.
 * Configure notification URL in Square Developer Dashboard to match `SQUARE_WEBHOOK_NOTIFICATION_URL` exactly.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-square-hmacsha256-signature") ?? "";
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim();
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL?.trim();

  if (!key || !notificationUrl) {
    console.error("[webhooks/square] SQUARE_WEBHOOK_SIGNATURE_KEY or SQUARE_WEBHOOK_NOTIFICATION_URL missing");
    return NextResponse.json({ error: "webhook_unconfigured" }, { status: 503 });
  }

  const ok = await WebhooksHelper.verifySignature({
    requestBody: raw,
    signatureHeader: sig,
    signatureKey: key,
    notificationUrl,
  });

  if (!ok) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const result = await reconcileSquarePaymentWebhook(body);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[webhooks/square POST]", e);
    return NextResponse.json({ error: "webhook_handler_failed" }, { status: 500 });
  }
}
