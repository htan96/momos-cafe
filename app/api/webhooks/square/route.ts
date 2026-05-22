import { NextResponse } from "next/server";
import { OperationalActivitySeverity, WebhookProcessingStatus } from "@prisma/client";
import { reconcileSquarePaymentWebhook } from "@/lib/payments/commercePaymentOrchestration";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { sha256HexUtf8 } from "@/lib/webhooks/payloadHash";
import {
  extractSquarePaymentWebhookEnvelope,
  inferLocalIdsFromPeekedWebhook,
} from "@/lib/webhooks/peekSquarePaymentFromWebhook";
import { extractSquareRefundWebhookEnvelope } from "@/lib/webhooks/peekSquareRefundFromWebhook";
import { inferLocalIdsFromSquareRefundPeek } from "@/lib/webhooks/inferLocalIdsFromSquareRefundPeek";
import { reconcileOperationalRefundCaseFromSquareWebhook } from "@/lib/payments/operationalRefundWebhook";
import { patchWebhookDeliveryReceipt, upsertWebhookDeliveryReceipt } from "@/lib/webhooks/recordWebhookDeliveryReceipt";
import {
  logSquareWebhookSignatureDiagnostics,
  readSquareWebhookSignatureHeader,
  verifySquareWebhookSignature,
} from "@/lib/webhooks/square/verifySquareWebhookSignature";
import { parseSquareWebhookRoot, readCorrelationRequestId } from "@/lib/webhooks/squareWebhookParse";

export const runtime = "nodejs";

/** Disable static/route caching — this handler must observe the live POST body from Square verbatim. */
export const dynamic = "force-dynamic";

const PROVIDER = "square";

async function linkOpsEventToReceipt(receiptId: string, opsEventId: string | null): Promise<void> {
  if (opsEventId) {
    await patchWebhookDeliveryReceipt(receiptId, { opsEventId });
  }
}

/**
 * Square merchant webhook — verifies HMAC before touching payments / orders.
 *
 * **`SQUARE_WEBHOOK_NOTIFICATION_URL`** must equal the webhook subscription Notification URL **exactly** as shown in the
 * Square Developer Dashboard (`https://`/`http://`, hostname, port if any, path, trailing slash — every character).
 * Signing input is **`notificationUrl + rawBody`** (UTF-8) per Square; see `verifySquareWebhookSignature`.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const payloadHash = sha256HexUtf8(raw);
  const correlationRequestId = readCorrelationRequestId(req);

  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim();
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL ?? "";

  if (!key?.length || !notificationUrl.trim()) {
    console.error("[webhooks/square] SQUARE_WEBHOOK_SIGNATURE_KEY or SQUARE_WEBHOOK_NOTIFICATION_URL missing");
    return NextResponse.json({ error: "webhook_unconfigured" }, { status: 503 });
  }

  /** Use exact env string for signing (aside from BOM / CR-only quirks); trimming only whitespace at ends. */
  const notificationUrlForSigning = notificationUrl.trim();
  const sig = readSquareWebhookSignatureHeader(req);
  const okSig = verifySquareWebhookSignature({
    rawBody: raw,
    signatureHeader: sig,
    signatureKey: key,
    notificationUrl: notificationUrlForSigning,
  });

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    parsed = null;
  }

  const trustedRoot = parsed ? parseSquareWebhookRoot(parsed) : { eventType: undefined, externalEventId: undefined };

  const signedPeek = okSig && parsed ? extractSquarePaymentWebhookEnvelope(parsed) : null;
  const signedInferred = signedPeek
    ? await inferLocalIdsFromPeekedWebhook({
        squarePaymentId: signedPeek.squarePaymentId,
        referenceId: signedPeek.referenceId,
      })
    : { commerceOrderId: null as string | null, paymentRecordId: null as string | null };

  const refundPeek = okSig && parsed ? extractSquareRefundWebhookEnvelope(parsed as Record<string, unknown>) : null;
  const refundInferred =
    refundPeek ?
      await inferLocalIdsFromSquareRefundPeek({ paymentId: refundPeek.paymentId })
    : { commerceOrderId: null as string | null, paymentRecordId: null as string | null };

  const mergedCommerceOrderId = signedInferred.commerceOrderId ?? refundInferred.commerceOrderId ?? null;
  const mergedPaymentRecordId = signedInferred.paymentRecordId ?? refundInferred.paymentRecordId ?? null;

  if (!okSig) {
    logSquareWebhookSignatureDiagnostics({
      req,
      correlationTag: "webhooks/square POST",
      rawBodyUtf8Length: raw.length,
      rawBodyPrefixChars: 240,
      rawBody: raw,
      signatureHeaderSeen: sig,
      notificationUrlUsedForSigning: notificationUrlForSigning,
    });
    /** Best-effort event id for receipts — unchanged from `trustedRoot` when JSON already parsed. */
    let untrustedRoot = trustedRoot;
    if (!parsed) {
      try {
        const maybe = JSON.parse(raw) as Record<string, unknown>;
        untrustedRoot = parseSquareWebhookRoot(maybe);
      } catch {
        untrustedRoot = { eventType: undefined, externalEventId: undefined };
      }
    }
    const { id: receiptId } = await upsertWebhookDeliveryReceipt({
      provider: PROVIDER,
      externalEventId: untrustedRoot.externalEventId,
      eventType: untrustedRoot.eventType,
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
      message: "Square webhook signature verification failed",
      correlation: { requestId: correlationRequestId },
      detail: {
        stage: "verify_signature",
        httpStatus: 401,
        receiptId,
        payloadHash,
        squareEventId: untrustedRoot.externalEventId ?? undefined,
      },
      source: { handler: "POST app/api/webhooks/square" },
      sourceTag: "webhooks.square",
    });
    await linkOpsEventToReceipt(receiptId, opsEventId);
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  if (!parsed) {
    const { id: receiptId } = await upsertWebhookDeliveryReceipt({
      provider: PROVIDER,
      externalEventId: trustedRoot.externalEventId,
      eventType: trustedRoot.eventType,
      payloadHash,
      signatureValid: true,
      processingStatus: WebhookProcessingStatus.failed,
      httpStatus: 400,
      errorCode: "INVALID_JSON",
    });
    const opsEventId = await emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.PAYMENT_WEBHOOK_PROCESSING_FAILED,
      category: "PAYMENT_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.warning,
      actorType: "service",
      message: "Square webhook payload was not valid JSON",
      correlation: { requestId: correlationRequestId },
      detail: { stage: "parse_json", httpStatus: 400, receiptId },
      source: { handler: "POST app/api/webhooks/square" },
      sourceTag: "webhooks.square",
    });
    await linkOpsEventToReceipt(receiptId, opsEventId);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const body = parsed;

  const { id: receiptId } = await upsertWebhookDeliveryReceipt({
    provider: PROVIDER,
    externalEventId: trustedRoot.externalEventId,
    eventType: trustedRoot.eventType,
    payloadHash,
    signatureValid: true,
    processingStatus: WebhookProcessingStatus.accepted,
    httpStatus: 200,
    commerceOrderId: mergedCommerceOrderId,
    paymentRecordId: mergedPaymentRecordId,
  });

  try {
    const result = await reconcileSquarePaymentWebhook(body, {
      receiptId,
      correlation: { requestId: correlationRequestId },
    });

    const refundEnv = extractSquareRefundWebhookEnvelope(body);
    if (refundEnv) {
      await reconcileOperationalRefundCaseFromSquareWebhook(refundEnv);
    }

    if (result.nonPaymentEnvelope) {
      await patchWebhookDeliveryReceipt(receiptId, {
        processingStatus: WebhookProcessingStatus.ignored,
        httpStatus: 200,
        errorCode: null,
        commerceOrderId: result.commerceOrderId ?? mergedCommerceOrderId,
        paymentRecordId: result.paymentRecordId ?? mergedPaymentRecordId,
      });
      return NextResponse.json(result);
    }

    if (result.orphanEmitted) {
      await patchWebhookDeliveryReceipt(receiptId, {
        processingStatus: WebhookProcessingStatus.failed,
        httpStatus: 200,
        errorCode: "ORPHAN_NO_LOCAL_PAYMENT",
        commerceOrderId: result.commerceOrderId ?? mergedCommerceOrderId,
        paymentRecordId: result.paymentRecordId ?? mergedPaymentRecordId,
      });
      return NextResponse.json(result);
    }

    await patchWebhookDeliveryReceipt(receiptId, {
      processingStatus: WebhookProcessingStatus.processed,
      httpStatus: 200,
      errorCode: null,
      commerceOrderId: result.commerceOrderId ?? mergedCommerceOrderId,
      paymentRecordId: result.paymentRecordId ?? mergedPaymentRecordId,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[webhooks/square POST]", e);
    await patchWebhookDeliveryReceipt(receiptId, {
      processingStatus: WebhookProcessingStatus.failed,
      httpStatus: 500,
      errorCode: "RECONCILE_THROW",
    });
    const opsEventId = await emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.PAYMENT_WEBHOOK_PROCESSING_FAILED,
      category: "PAYMENT_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.error,
      actorType: "service",
      message: "Square webhook reconcile pipeline threw unexpectedly",
      correlation: { requestId: correlationRequestId },
      entities: {
        commerceOrderId: mergedCommerceOrderId ?? undefined,
        paymentRecordId: mergedPaymentRecordId ?? undefined,
      },
      detail: {
        stage: "reconcileSquarePaymentWebhook",
        httpStatus: 500,
        errorName: e instanceof Error ? e.name : typeof e,
        receiptId,
      },
      source: { handler: "POST app/api/webhooks/square" },
      sourceTag: "webhooks.square",
    });
    await linkOpsEventToReceipt(receiptId, opsEventId);
    return NextResponse.json({ error: "webhook_handler_failed" }, { status: 500 });
  }
}
