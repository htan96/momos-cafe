import { WebhookProcessingStatus } from "@prisma/client";
import { reconcileSquarePaymentWebhook, type SquarePaymentWebhookReconcileResult } from "@/lib/payments/commercePaymentOrchestration";
import { patchWebhookDeliveryReceipt } from "@/lib/webhooks/recordWebhookDeliveryReceipt";
import {
  extractSquarePaymentWebhookEnvelope,
  inferLocalIdsFromPeekedWebhook,
} from "@/lib/webhooks/peekSquarePaymentFromWebhook";
import { extractSquareRefundWebhookEnvelope } from "@/lib/webhooks/peekSquareRefundFromWebhook";
import { inferLocalIdsFromSquareRefundPeek } from "@/lib/webhooks/inferLocalIdsFromSquareRefundPeek";
import type { ReplaySignatureVerification } from "@/lib/super-admin/operations/webhookReplay/replayWebhookVerification";
import {
  reconcileShippoWebhook,
  resolveShippoWebhookPeekLink,
  type ShippoWebhookReconcileResult,
} from "@/lib/webhooks/shippo/reconcileShippoWebhook";
import { peekShippoWebhookEnvelope } from "@/lib/webhooks/shippo/shippoWebhookParse";

export async function inferMergedSquareLinkage(body: Record<string, unknown>): Promise<{
  mergedCommerceOrderId: string | null;
  mergedPaymentRecordId: string | null;
}> {
  const signedPeek = extractSquarePaymentWebhookEnvelope(body);
  const refundPeek = extractSquareRefundWebhookEnvelope(body);

  const signedInferred =
    signedPeek ?
      await inferLocalIdsFromPeekedWebhook({
        squarePaymentId: signedPeek.squarePaymentId,
        referenceId: signedPeek.referenceId,
      })
    : { commerceOrderId: null as string | null, paymentRecordId: null as string | null };

  const refundInferred =
    refundPeek ?
      await inferLocalIdsFromSquareRefundPeek({ paymentId: refundPeek.paymentId })
    : { commerceOrderId: null as string | null, paymentRecordId: null as string | null };

  return {
    mergedCommerceOrderId: signedInferred.commerceOrderId ?? refundInferred.commerceOrderId ?? null,
    mergedPaymentRecordId: signedInferred.paymentRecordId ?? refundInferred.paymentRecordId ?? null,
  };
}

async function peekShippoCommerceOrderSafe(webhookBody: Record<string, unknown>): Promise<string | null> {
  try {
    const row = await resolveShippoWebhookPeekLink(peekShippoWebhookEnvelope(webhookBody));
    return row.commerceOrderId;
  } catch {
    return null;
  }
}

export function replaySignatureValidityForReceipt(verification: ReplaySignatureVerification): boolean {
  if (!verification.required) return true;
  return verification.status === "verified";
}

async function finalizeSquareWebhookReceiptPatches(
  receiptId: string,
  result: SquarePaymentWebhookReconcileResult,
  mergedCommerceOrderId: string | null,
  mergedPaymentRecordId: string | null,
  newHash: string,
  verification: ReplaySignatureVerification
): Promise<void> {
  const sig = replaySignatureValidityForReceipt(verification);

  if (result.nonPaymentEnvelope) {
    await patchWebhookDeliveryReceipt(receiptId, {
      payloadHash: newHash,
      signatureValid: sig,
      processingStatus: WebhookProcessingStatus.ignored,
      httpStatus: 200,
      errorCode: null,
      commerceOrderId: result.commerceOrderId ?? mergedCommerceOrderId,
      paymentRecordId: result.paymentRecordId ?? mergedPaymentRecordId,
    });
    return;
  }

  if (result.orphanEmitted) {
    await patchWebhookDeliveryReceipt(receiptId, {
      payloadHash: newHash,
      signatureValid: sig,
      processingStatus: WebhookProcessingStatus.failed,
      httpStatus: 200,
      errorCode: "ORPHAN_NO_LOCAL_PAYMENT",
      commerceOrderId: result.commerceOrderId ?? mergedCommerceOrderId,
      paymentRecordId: result.paymentRecordId ?? mergedPaymentRecordId,
    });
    return;
  }

  await patchWebhookDeliveryReceipt(receiptId, {
    payloadHash: newHash,
    signatureValid: sig,
    processingStatus: WebhookProcessingStatus.processed,
    httpStatus: 200,
    errorCode: null,
    commerceOrderId: result.commerceOrderId ?? mergedCommerceOrderId,
    paymentRecordId: result.paymentRecordId ?? mergedPaymentRecordId,
  });
}

async function finalizeShippoWebhookReceiptPatches(
  receiptId: string,
  result: ShippoWebhookReconcileResult,
  mergedCommerceOrderId: string | null,
  newHash: string,
  verification: ReplaySignatureVerification
): Promise<void> {
  const sig = replaySignatureValidityForReceipt(verification);

  if (result.ignored) {
    await patchWebhookDeliveryReceipt(receiptId, {
      payloadHash: newHash,
      signatureValid: sig,
      processingStatus: WebhookProcessingStatus.ignored,
      httpStatus: 200,
      errorCode: null,
      commerceOrderId: result.commerceOrderId ?? mergedCommerceOrderId,
    });
    return;
  }

  if (result.orphanEmitted) {
    await patchWebhookDeliveryReceipt(receiptId, {
      payloadHash: newHash,
      signatureValid: sig,
      processingStatus: WebhookProcessingStatus.failed,
      httpStatus: 200,
      errorCode: "ORPHAN_NO_LOCAL_SHIPMENT",
      commerceOrderId: mergedCommerceOrderId ?? result.commerceOrderId,
    });
    return;
  }

  await patchWebhookDeliveryReceipt(receiptId, {
    payloadHash: newHash,
    signatureValid: sig,
    processingStatus: WebhookProcessingStatus.processed,
    httpStatus: 200,
    errorCode: null,
    commerceOrderId: result.commerceOrderId ?? mergedCommerceOrderId,
  });
}

/**
 * Executes Square payment reconcile only (explicitly **never** invokes operational refund-case webhook reconcile).
 */
export async function executeOperationalSquareWebhookReplay(input: {
  receiptId: string;
  body: Record<string, unknown>;
  newPayloadHash: string;
  verification: ReplaySignatureVerification;
}): Promise<SquarePaymentWebhookReconcileResult> {
  const linkage = await inferMergedSquareLinkage(input.body);

  try {
    const result = await reconcileSquarePaymentWebhook(input.body, {
      receiptId: input.receiptId,
      correlation: { requestId: `replay-square-${input.receiptId}` },
    });

    await finalizeSquareWebhookReceiptPatches(
      input.receiptId,
      result,
      linkage.mergedCommerceOrderId,
      linkage.mergedPaymentRecordId,
      input.newPayloadHash,
      input.verification
    );
    return result;
  } catch (e) {
    await patchWebhookDeliveryReceipt(input.receiptId, {
      processingStatus: WebhookProcessingStatus.failed,
      httpStatus: 500,
      errorCode: "RECONCILE_THROW_REPLAY",
      payloadHash: input.newPayloadHash,
      signatureValid: replaySignatureValidityForReceipt(input.verification),
    });
    throw e;
  }
}

export async function executeOperationalShippoWebhookReplay(input: {
  receiptId: string;
  body: Record<string, unknown>;
  newPayloadHash: string;
  verification: ReplaySignatureVerification;
}): Promise<ShippoWebhookReconcileResult> {
  let mergedCommerceOrderId: string | null = null;
  try {
    mergedCommerceOrderId = await peekShippoCommerceOrderSafe(input.body);
  } catch {
    mergedCommerceOrderId = null;
  }

  try {
    const result = await reconcileShippoWebhook(input.body, {
      receiptId: input.receiptId,
      correlation: { requestId: `replay-shippo-${input.receiptId}` },
    });

    if (mergedCommerceOrderId === null && result.commerceOrderId) {
      mergedCommerceOrderId = result.commerceOrderId;
    }

    await finalizeShippoWebhookReceiptPatches(input.receiptId, result, mergedCommerceOrderId, input.newPayloadHash, input.verification);

    return result;
  } catch (e) {
    await patchWebhookDeliveryReceipt(input.receiptId, {
      processingStatus: WebhookProcessingStatus.failed,
      httpStatus: 500,
      errorCode: "RECONCILE_THROW_REPLAY",
      commerceOrderId: mergedCommerceOrderId,
      payloadHash: input.newPayloadHash,
      signatureValid: replaySignatureValidityForReceipt(input.verification),
    });
    throw e;
  }
}
