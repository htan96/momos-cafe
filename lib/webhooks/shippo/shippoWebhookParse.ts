import { sha256HexUtf8 } from "@/lib/webhooks/payloadHash";

export type ShippoWebhookRootFields = {
  eventType?: string;
  externalEventId?: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Best-effort Shippo webhook body → tracking-like object (handles `track_updated` envelope or bare Tracking payloads). */
export function readShippoTrackingPayload(body: Record<string, unknown>): Record<string, unknown> | null {
  const evt = typeof body.event === "string" ? body.event.trim().toLowerCase() : "";
  if ((evt === "track_updated" || evt === "") && isPlainObject(body.data)) {
    return body.data as Record<string, unknown>;
  }
  if (typeof body.tracking_number === "string" || typeof body.tracking_status === "object") {
    return body;
  }
  return null;
}

export type ShippoWebhookEnvelopePeek = ShippoWebhookRootFields & {
  /** Raw webhook `event` when present (`track_updated`, `transaction_created`, …). */
  shippoWebhookEventRaw?: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  /** Shippo transaction / label object id surfaced on Tracking (`transaction`). */
  shippoTransactionId?: string | null;
  /** Latest `tracking_status.status` uppercase token when present (e.g. DELIVERED). */
  carrierStatusUpper?: string | null;
  /** Dedupe fingerprint when Shippo omits `tracking_status.object_id`. */
  dedupeFingerprint?: string;
};

function trimStr(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

/**
 * Peek parsed JSON prior to reconcile — derives dedupe keys and lightweight shipment-link hints without DB.
 */
export function peekShippoWebhookEnvelope(body: Record<string, unknown>): ShippoWebhookEnvelopePeek {
  const shippoWebhookEventRaw = typeof body.event === "string" ? body.event.trim() : undefined;

  const track = readShippoTrackingPayload(body);
  let trackingNumber: string | null = null;
  let carrier: string | null = null;
  let shippoTransactionId: string | null = null;
  let carrierStatusUpper: string | null = null;
  let statusObjectId: string | null = null;
  let statusDate: string | null = null;

  if (track) {
    trackingNumber = trimStr(track.tracking_number) ?? trimStr(track.trackingNumber);
    carrier =
      trimStr(track.carrier) ??
      trimStr(track.carrier_name) ??
      (isPlainObject(track.carrier_details) ?
        trimStr((track.carrier_details as Record<string, unknown>).name)
      : null);

    const txRaw = track.transaction ?? track.transaction_id ?? track.Transaction;
    const txTrim = trimStr(txRaw);
    shippoTransactionId = txTrim;

    const ts = track.tracking_status;
    const tsObj =
      typeof ts === "object" && ts !== null && !Array.isArray(ts) ?
        (ts as Record<string, unknown>)
      : null;

    if (tsObj) {
      const st = trimStr(tsObj.status) ?? trimStr(tsObj.SubStatus);
      if (st) carrierStatusUpper = st.trim().toUpperCase();
      statusObjectId =
        trimStr(tsObj.object_id) ?? trimStr(tsObj.ObjectId) ?? trimStr(tsObj.objectId);
      statusDate =
        trimStr(tsObj.object_updated) ?? trimStr(tsObj.status_date) ?? trimStr(tsObj.statusDate);
    }
  }

  const eventPart = shippoWebhookEventRaw ? shippoWebhookEventRaw.toLowerCase() : "(no-event)";
  const structuralKey = [
    eventPart,
    carrier ?? "",
    trackingNumber ?? "",
    shippoTransactionId ?? "",
    carrierStatusUpper ?? "",
    statusObjectId ?? "",
    statusDate ?? "",
  ].join("|");
  const fallbackFingerprint =
    structuralKey.trim().length > 0 ?
      structuralKey
    : sha256HexUtf8(JSON.stringify(body));

  /** Unique per-tracking-status webhook row when Shippo emits `tracking_status.object_id`; else stable-ish hash fingerprint. */
  const externalEventId =
    statusObjectId?.trim() ||
    sha256HexUtf8(fallbackFingerprint).slice(0, 48);

  return {
    eventType: shippoWebhookEventRaw,
    externalEventId,
    shippoWebhookEventRaw,
    trackingNumber,
    carrier,
    shippoTransactionId,
    carrierStatusUpper,
    dedupeFingerprint: fallbackFingerprint,
  };
}

/** Same fields as peeked envelope for persisted receipts / logs. */
export function peekShippoWebhookRoot(body: Record<string, unknown>): ShippoWebhookRootFields {
  const p = peekShippoWebhookEnvelope(body);
  return { eventType: p.eventType, externalEventId: p.externalEventId };
}
