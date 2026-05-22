import { prisma } from "@/lib/prisma";
import { extractSquarePaymentWebhookEnvelope, inferLocalIdsFromPeekedWebhook } from "@/lib/webhooks/peekSquarePaymentFromWebhook";
import { extractSquareRefundWebhookEnvelope } from "@/lib/webhooks/peekSquareRefundFromWebhook";
import { inferLocalIdsFromSquareRefundPeek } from "@/lib/webhooks/inferLocalIdsFromSquareRefundPeek";
import { parseSquareWebhookRoot } from "@/lib/webhooks/squareWebhookParse";
import { mapShippoTrackingStatusToSignal } from "@/lib/webhooks/shippo/mapShippoTrackingToPlatform";
import { resolveShippoWebhookPeekLink } from "@/lib/webhooks/shippo/reconcileShippoWebhook";
import { peekShippoWebhookEnvelope, peekShippoWebhookRoot, readShippoTrackingPayload } from "@/lib/webhooks/shippo/shippoWebhookParse";

async function lookupPaymentRecordForSquareEnvelope(
  extracted: NonNullable<ReturnType<typeof extractSquarePaymentWebhookEnvelope>>
) {
  const { squarePaymentId, referenceId } = extracted;
  return (
    (await prisma.paymentRecord.findFirst({
      where: { squarePaymentId },
    })) ??
    (referenceId
      ? await prisma.paymentRecord.findFirst({
          where: { OR: [{ id: referenceId }, { idempotencyKey: referenceId }] },
        })
      : null)
  );
}

/**
 * Read-only preview of what `reconcileSquarePaymentWebhook` / `reconcileShippoWebhook` would consider.
 * Does **not** perform writes. Square operational refund-case webhook reconcile is intentionally excluded from replay.
 */
export async function buildOperationalWebhookReplayPlan(input: {
  provider: string;
  body: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  if (input.provider === "square") {
    const root = parseSquareWebhookRoot(input.body);
    const paymentPeek = extractSquarePaymentWebhookEnvelope(input.body);
    const refundPeek = extractSquareRefundWebhookEnvelope(input.body as Record<string, unknown>);

    const signedInferred = paymentPeek
      ? await inferLocalIdsFromPeekedWebhook({
          squarePaymentId: paymentPeek.squarePaymentId,
          referenceId: paymentPeek.referenceId,
        })
      : { commerceOrderId: null as string | null, paymentRecordId: null as string | null };

    const refundInferred = refundPeek
      ? await inferLocalIdsFromSquareRefundPeek({ paymentId: refundPeek.paymentId })
      : { commerceOrderId: null as string | null, paymentRecordId: null as string | null };

    const mergedCommerceOrderId = signedInferred.commerceOrderId ?? refundInferred.commerceOrderId ?? null;
    const mergedPaymentRecordId = signedInferred.paymentRecordId ?? refundInferred.paymentRecordId ?? null;

    if (!paymentPeek) {
      return {
        provider: "square",
        root,
        paymentEnvelope: null,
        refundEnvelopePresent: Boolean(refundPeek),
        financialSafetyNote:
          "Operational refund-case webhook reconcile (`reconcileOperationalRefundCaseFromSquareWebhook`) is suppressed on super-admin replay — payment webhook reconcile only.",
        expectedReconcile: {
          handler: "reconcileSquarePaymentWebhook",
          outcome: "non_payment_envelope",
          detail: "Would mark receipt ignored in live route (no payment.* object).",
        },
        inferredLinks: { mergedCommerceOrderId, mergedPaymentRecordId },
      };
    }

    const record = await lookupPaymentRecordForSquareEnvelope(paymentPeek);
    if (!record) {
      return {
        provider: "square",
        root,
        paymentEnvelope: {
          squarePaymentId: paymentPeek.squarePaymentId,
          status: paymentPeek.status,
          referenceId: paymentPeek.referenceId ?? null,
        },
        refundEnvelopePresent: Boolean(refundPeek),
        financialSafetyNote:
          "Operational refund-case webhook reconcile is suppressed on replay. This plan still runs `reconcileSquarePaymentWebhook` only (idempotent local payment row + order status).",
        expectedReconcile: {
          handler: "reconcileSquarePaymentWebhook",
          outcome: "orphan_no_local_payment",
          detail: "Would emit orphan platform event + append notification outbox row (no Square refund API).",
        },
        inferredLinks: { mergedCommerceOrderId, mergedPaymentRecordId },
      };
    }

    return {
      provider: "square",
      root,
      paymentEnvelope: {
        squarePaymentId: paymentPeek.squarePaymentId,
        status: paymentPeek.status,
        referenceId: paymentPeek.referenceId ?? null,
      },
      refundEnvelopePresent: Boolean(refundPeek),
      financialSafetyNote:
        "Operational refund-case webhook reconcile is suppressed on replay; only `reconcileSquarePaymentWebhook` runs.",
      expectedReconcile: {
        handler: "reconcileSquarePaymentWebhook",
        outcome: "match_local_payment_record",
        paymentRecordId: record.id,
        commerceOrderId: record.orderId ?? null,
      },
      inferredLinks: { mergedCommerceOrderId, mergedPaymentRecordId },
    };
  }

  if (input.provider === "shippo") {
    const root = peekShippoWebhookRoot(input.body);
    const peek = peekShippoWebhookEnvelope(input.body);
    const eventLower = peek.shippoWebhookEventRaw?.trim().toLowerCase() ?? "";

    if (peek.shippoWebhookEventRaw && eventLower !== "track_updated") {
      return {
        provider: "shippo",
        root,
        peek: {
          event: peek.shippoWebhookEventRaw,
          trackingNumber: peek.trackingNumber ?? null,
          shippoTransactionId: peek.shippoTransactionId ?? null,
          carrier: peek.carrier ?? null,
          carrierStatusUpper: peek.carrierStatusUpper ?? null,
        },
        expectedReconcile: {
          handler: "reconcileShippoWebhook",
          outcome: "ignored_unhandled_event",
        },
      };
    }

    const trackBlob = readShippoTrackingPayload(input.body);
    if (!trackBlob || (!peek.trackingNumber && !peek.shippoTransactionId)) {
      return {
        provider: "shippo",
        root,
        peek: {
          event: peek.shippoWebhookEventRaw ?? null,
          trackingNumber: peek.trackingNumber ?? null,
          shippoTransactionId: peek.shippoTransactionId ?? null,
        },
        expectedReconcile: {
          handler: "reconcileShippoWebhook",
          outcome: "ignored_no_tracking_hints",
        },
      };
    }

    const plat = mapShippoTrackingStatusToSignal(peek.carrierStatusUpper);
    const link = await resolveShippoWebhookPeekLink(peek);

    if (!link.shipmentId) {
      return {
        provider: "shippo",
        root,
        peek: {
          event: peek.shippoWebhookEventRaw ?? null,
          trackingNumber: peek.trackingNumber ?? null,
          shippoTransactionId: peek.shippoTransactionId ?? null,
          carrier: peek.carrier ?? null,
          carrierStatusUpper: peek.carrierStatusUpper ?? null,
        },
        platformSignal: { signal: plat.signal, shipmentStatus: plat.shipmentStatus ?? null },
        expectedReconcile: {
          handler: "reconcileShippoWebhook",
          outcome: "orphan_no_local_shipment",
        },
      };
    }

    return {
      provider: "shippo",
      root,
      peek: {
        event: peek.shippoWebhookEventRaw ?? null,
        trackingNumber: peek.trackingNumber ?? null,
        shippoTransactionId: peek.shippoTransactionId ?? null,
        carrier: peek.carrier ?? null,
        carrierStatusUpper: peek.carrierStatusUpper ?? null,
      },
      platformSignal: { signal: plat.signal, shipmentStatus: plat.shipmentStatus ?? null },
      expectedReconcile: {
        handler: "reconcileShippoWebhook",
        outcome: "update_local_shipment_and_emit_timeline",
        shipmentId: link.shipmentId,
        commerceOrderId: link.commerceOrderId,
      },
    };
  }

  return {
    provider: input.provider,
    expectedReconcile: null,
    note: "No structured replay plan for this provider.",
  };
}
