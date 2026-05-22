import { NextResponse } from "next/server";
import { OperationalActivitySeverity, WebhookProcessingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { sha256HexUtf8 } from "@/lib/webhooks/payloadHash";
import { patchWebhookDeliveryReceipt, upsertWebhookDeliveryReceipt } from "@/lib/webhooks/recordWebhookDeliveryReceipt";
import { readCorrelationRequestId } from "@/lib/webhooks/squareWebhookParse";
import { reconcileShippoWebhook, resolveShippoWebhookPeekLink } from "@/lib/webhooks/shippo/reconcileShippoWebhook";
import { peekShippoWebhookEnvelope, peekShippoWebhookRoot } from "@/lib/webhooks/shippo/shippoWebhookParse";
import { readShippoSignatureHeader, verifyShippoWebhookSignature } from "@/lib/webhooks/shippo/verifyShippoWebhookSignature";

export const runtime = "nodejs";

const PROVIDER = "shippo";

async function linkOpsEventToReceipt(receiptId: string, opsEventId: string | null): Promise<void> {
  if (opsEventId) {
    await patchWebhookDeliveryReceipt(receiptId, { opsEventId });
  }
}

async function peekCommerceOrderSafe(body: Record<string, unknown>): Promise<string | null> {
  try {
    const row = await resolveShippoWebhookPeekLink(peekShippoWebhookEnvelope(body));
    return row.commerceOrderId;
  } catch {
    return null;
  }
}

/**
 * Shippo webhook — verifies HMAC whenever `SHIPPO_WEBHOOK_SECRET` is configured.
 * Mirrors Square receipt semantics (`WebhookDeliveryReceipt`) while remaining **public** (`middleware.ts` skips this path).
 *
 * Replay idempotency: identical `(provider, external_event_id)` + payload hash skips reconcile work once `processed`.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const payloadHash = sha256HexUtf8(raw);
  const correlationRequestId = readCorrelationRequestId(req);

  const webhookSecretTrim = process.env.SHIPPO_WEBHOOK_SECRET?.trim() ?? "";
  const verifyEnabled = webhookSecretTrim.length > 0;
  const sigHeader = readShippoSignatureHeader(req);
  const signatureOk =
    !verifyEnabled || verifyShippoWebhookSignature({ rawBody: raw, signatureHeader: sigHeader, secret: webhookSecretTrim });

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    parsed = null;
  }

  const trustedPeekFromParse = parsed ? peekShippoWebhookRoot(parsed) : { eventType: undefined, externalEventId: undefined };

  if (!signatureOk) {
    const leakPeek =
      parsed ? peekShippoWebhookRoot(parsed) : { eventType: undefined, externalEventId: undefined };
    const { id: receiptId } = await upsertWebhookDeliveryReceipt({
      provider: PROVIDER,
      externalEventId: leakPeek.externalEventId ?? null,
      eventType: leakPeek.eventType,
      payloadHash,
      signatureValid: false,
      processingStatus: WebhookProcessingStatus.failed,
      httpStatus: 401,
      errorCode: "SIGNATURE_INVALID",
    });
    const opsEventId = await emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.SECURITY_WEBHOOK_SIGNATURE_INVALID,
      category: "SECURITY_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.error,
      actorType: "service",
      message: "Shippo webhook signature verification failed",
      correlation: { requestId: correlationRequestId },
      detail: {
        stage: "verify_shippo_hmac",
        httpStatus: 401,
        receiptId,
        verifyEnabled,
      },
      source: { handler: "POST app/api/webhooks/shippo" },
      sourceTag: "webhooks.shippo",
    });
    await linkOpsEventToReceipt(receiptId, opsEventId);
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  if (!parsed) {
    const { id: receiptId } = await upsertWebhookDeliveryReceipt({
      provider: PROVIDER,
      externalEventId: trustedPeekFromParse.externalEventId,
      eventType: trustedPeekFromParse.eventType,
      payloadHash,
      signatureValid: true,
      processingStatus: WebhookProcessingStatus.failed,
      httpStatus: 400,
      errorCode: "INVALID_JSON",
    });
    const opsEventId = await emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_WEBHOOK_PROCESSING_FAILED,
      category: "SHIPMENT_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.warning,
      actorType: "service",
      message: "Shippo webhook payload was not valid JSON",
      correlation: { requestId: correlationRequestId },
      detail: { stage: "parse_json", httpStatus: 400, receiptId },
      source: { handler: "POST app/api/webhooks/shippo" },
      sourceTag: "webhooks.shippo",
    });
    await linkOpsEventToReceipt(receiptId, opsEventId);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const body = parsed;
  const trustedRoot = peekShippoWebhookRoot(body);
  const ext = trustedRoot.externalEventId?.trim() || null;

  /** Soft idempotency for Shippo retries (same hashed payload fingerprint). */
  if (ext) {
    const prior = await prisma.webhookDeliveryReceipt.findFirst({
      where: { provider: PROVIDER, externalEventId: ext },
      select: { payloadHash: true, processingStatus: true },
    });
    if (prior?.processingStatus === WebhookProcessingStatus.processed && prior.payloadHash === payloadHash) {
      return NextResponse.json({
        ok: true,
        deduped: true,
        fingerprint: ext,
      });
    }
  }

  let mergedCommerceOrderId: string | null = null;
  try {
    mergedCommerceOrderId = await peekCommerceOrderSafe(body);
  } catch {
    mergedCommerceOrderId = null;
  }

  const { id: receiptId } = await upsertWebhookDeliveryReceipt({
    provider: PROVIDER,
    externalEventId: ext,
    eventType: trustedRoot.eventType,
    payloadHash,
    signatureValid: true,
    processingStatus: WebhookProcessingStatus.accepted,
    httpStatus: 200,
    commerceOrderId: mergedCommerceOrderId,
  });

  try {
    const result = await reconcileShippoWebhook(body, {
      receiptId,
      correlation: { requestId: correlationRequestId },
    });

    if (mergedCommerceOrderId === null && result.commerceOrderId) {
      mergedCommerceOrderId = result.commerceOrderId;
    }

    if (result.ignored) {
      await patchWebhookDeliveryReceipt(receiptId, {
        processingStatus: WebhookProcessingStatus.ignored,
        httpStatus: 200,
        errorCode: null,
        commerceOrderId: result.commerceOrderId ?? mergedCommerceOrderId,
      });
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: result.reason,
      });
    }

    if (result.orphanEmitted) {
      await patchWebhookDeliveryReceipt(receiptId, {
        processingStatus: WebhookProcessingStatus.failed,
        httpStatus: 200,
        errorCode: "ORPHAN_NO_LOCAL_SHIPMENT",
        commerceOrderId: mergedCommerceOrderId ?? result.commerceOrderId,
      });
      return NextResponse.json({
        ok: true,
        orphan: true,
        reason: result.reason,
      });
    }

    await patchWebhookDeliveryReceipt(receiptId, {
      processingStatus: WebhookProcessingStatus.processed,
      httpStatus: 200,
      errorCode: null,
      commerceOrderId: result.commerceOrderId ?? mergedCommerceOrderId,
    });
    return NextResponse.json({
      ok: true,
      outcome: result.eventOutcome ?? "processed",
      commerceOrderId: result.commerceOrderId ?? mergedCommerceOrderId,
    });
  } catch (e) {
    console.error("[webhooks/shippo POST]", e);
    await patchWebhookDeliveryReceipt(receiptId, {
      processingStatus: WebhookProcessingStatus.failed,
      httpStatus: 500,
      errorCode: "RECONCILE_THROW",
      commerceOrderId: mergedCommerceOrderId,
    });
    const opsEventId = await emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_WEBHOOK_PROCESSING_FAILED,
      category: "SHIPMENT_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.error,
      actorType: "service",
      message: "Shippo webhook reconcile pipeline threw unexpectedly",
      correlation: { requestId: correlationRequestId },
      entities: mergedCommerceOrderId ? { commerceOrderId: mergedCommerceOrderId } : {},
      detail: {
        stage: "reconcileShippoWebhook",
        httpStatus: 500,
        errorName: e instanceof Error ? e.name : typeof e,
        receiptId,
      },
      source: { handler: "POST app/api/webhooks/shippo" },
      sourceTag: "webhooks.shippo",
    });
    await linkOpsEventToReceipt(receiptId, opsEventId);
    return NextResponse.json({ error: "webhook_handler_failed" }, { status: 500 });
  }
}
