/**
 * Read-only synthesis of persisted transport hints on `notification_events.payload`.
 * Mirrors patterns in `notificationDeliverySignals.ts` intentionally — keep one implementation here.
 */

import type { ParsedOperatorRequeueMode } from "@/lib/super-admin/notifications/communicationTruth/types";

export type ProviderCommunicationTruth = {
  providerMessageId: string | null;
  /** Provider accepted / recorded a correlation id from the outbound API path (still not inbox proof). */
  transportSubmissionObserved: boolean;
  /** Human-visible disclaimer when we stamp success bookkeeping without asserting mailbox delivery. */
  customerDeliveryDisclaimer: string;
  /**
   * True when `_process.lastError` / `lastErrorCode` text matches common bounce/suppression wording.
   * **Not** wired to SES SNS delivery/bounce events in production today.
   */
  bounceHintFromPayloadTextOnly: boolean;
  /** Explicit visibility: no durable bounce → notification correlation pipeline is implemented here. */
  bounceTelemetryInProduct: false;
};

type ProcessSlice = {
  lastError?: unknown;
  lastErrorCode?: unknown;
  last_provider_message_id?: string | null;
  attempts?: unknown;
  delivery_attempt?: unknown;
  lastAttemptAt?: unknown;
  processing_started_at?: unknown;
};

export function readNotificationPayloadProcessSlice(payload: unknown): ProcessSlice {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  const meta = (payload as Record<string, unknown>)._process;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  return meta as ProcessSlice;
}

export function extractNotificationProviderMessageId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const r = payload as Record<string, unknown>;
  if (typeof r.provider_message_id === "string" && r.provider_message_id.trim()) {
    return r.provider_message_id.trim();
  }
  const nested = readNotificationPayloadProcessSlice(payload).last_provider_message_id;
  if (typeof nested === "string" && nested.trim()) return nested.trim();
  return null;
}

const BOUNCE_OR_SUPPRESSION_HINT =
  /\b(bounce|bounced|complaint|complained|suppression|suppressed|denylist|block\s*list|mailbox\s*full|reject(ed)?)\b/i;

export function notificationPayloadSuggestBounceSignal(payload: unknown): boolean {
  const slice = readNotificationPayloadProcessSlice(payload);
  const needles: string[] = [];
  for (const field of [slice.lastError, slice.lastErrorCode]) {
    if (typeof field === "string" && field.trim()) needles.push(field);
  }
  return needles.some((chunk) => BOUNCE_OR_SUPPRESSION_HINT.test(chunk));
}

/** Pull last attempt bookkeeping timestamps / codes for timelines (single latest snapshot — no multi-attempt history in JSON). */
export function readLatestAttemptFingerprint(payload: unknown): {
  lastAttemptAtIso: string | null;
  attemptsApprox: number | null;
  processingStartedAtIso: string | null;
  lastErrorPreview: string | null;
  lastErrorCode: string | null;
} {
  const slice = readNotificationPayloadProcessSlice(payload);
  const attemptsRaw = slice.attempts ?? slice.delivery_attempt;
  const attemptsApprox =
    typeof attemptsRaw === "number" && Number.isFinite(attemptsRaw) ? attemptsRaw : null;
  const lastAttemptAtIso = typeof slice.lastAttemptAt === "string" && slice.lastAttemptAt.trim() ? slice.lastAttemptAt.trim() : null;
  const processingStartedAtIso =
    typeof slice.processing_started_at === "string" && slice.processing_started_at.trim() ? slice.processing_started_at.trim() : null;

  let lastErrorPreview: string | null = null;
  let lastErrorCode: string | null = null;
  const code = slice.lastErrorCode;
  const err = slice.lastError;
  if (typeof code === "string" && code.trim()) lastErrorCode = code.trim();
  if (typeof err === "string" && err.trim()) lastErrorPreview = err.trim().slice(0, 120);

  return { lastAttemptAtIso, attemptsApprox, processingStartedAtIso, lastErrorPreview, lastErrorCode };
}

export function buildProviderCommunicationTruth(payload: unknown): ProviderCommunicationTruth {
  const providerMessageId = extractNotificationProviderMessageId(payload);
  const bounceHintFromPayloadTextOnly = notificationPayloadSuggestBounceSignal(payload);

  const transportSubmissionObserved = providerMessageId != null;

  let customerDeliveryDisclaimer =
    transportSubmissionObserved ?
      "Transport accepted our outbound submission (persisted correlation id). Inbox placement, reads, delays, downstream reputation, and disposition are not asserted by this datastore."
    : "No persisted transport correlation id on this snapshot — outbound success may reflect non-email delegation or pre-metadata rows; inbox truth is unknown here.";

  if (bounceHintFromPayloadTextOnly) {
    customerDeliveryDisclaimer +=
      " Payload wording hints suppression/bounces — corroborate with provider consoles; SNS bounce ingestion is stub-only.";
  }

  return {
    providerMessageId,
    transportSubmissionObserved,
    customerDeliveryDisclaimer,
    bounceHintFromPayloadTextOnly,
    bounceTelemetryInProduct: false,
  };
}

export function parseGovernanceOperatorRequeueMode(metadata: unknown): ParsedOperatorRequeueMode {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "unknown";
  const mode = (metadata as Record<string, unknown>).mode;
  if (mode === "lease_release") return "lease_release";
  if (mode === "dead_letter_rewind") return "dead_letter_rewind";
  return "unknown";
}
