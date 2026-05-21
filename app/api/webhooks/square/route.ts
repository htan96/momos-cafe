import { NextResponse } from "next/server";
import { WebhooksHelper } from "square";
import { reconcileSquarePaymentWebhook } from "@/lib/payments/commercePaymentOrchestration";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { OperationalActivitySeverity } from "@prisma/client";

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
    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.SECURITY_WEBHOOK_SIGNATURE_INVALID,
      category: "SECURITY_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.error,
      actorType: "service",
      message: "Square webhook signature verification failed",
      detail: { stage: "verify_signature", httpStatus: 401 },
      source: { handler: "POST app/api/webhooks/square" },
      sourceTag: "webhooks.square",
    });
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.PAYMENT_WEBHOOK_PROCESSING_FAILED,
      category: "PAYMENT_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.warning,
      actorType: "service",
      message: "Square webhook payload was not valid JSON",
      detail: { stage: "parse_json", httpStatus: 400 },
      source: { handler: "POST app/api/webhooks/square" },
      sourceTag: "webhooks.square",
    });
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const result = await reconcileSquarePaymentWebhook(body);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[webhooks/square POST]", e);
    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.PAYMENT_WEBHOOK_PROCESSING_FAILED,
      category: "PAYMENT_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.error,
      actorType: "service",
      message: "Square webhook reconcile pipeline threw unexpectedly",
      detail: {
        stage: "reconcileSquarePaymentWebhook",
        httpStatus: 500,
        errorName: e instanceof Error ? e.name : typeof e,
      },
      source: { handler: "POST app/api/webhooks/square" },
      sourceTag: "webhooks.square",
    });
    return NextResponse.json({ error: "webhook_handler_failed" }, { status: 500 });
  }
}
