/**
 * Operational UI taxonomy for notification outbox rows. Does **not** change processor semantics —
 * aligns with comments in {@link processNotificationOutbox}.
 *
 * **Retry semantics (summary):**
 * - Pending / failed_retryable rows with `processed_at` null rely on cron calling
 *   `/api/internal/cron/notification-outbox` to claim work and advance attempts.
 * - `started_processing_at` is a single-flight lease; cron clears stale leases (>15m) before selecting rows.
 * - Terminal rows set `processed_at`; dead-letters record `_process.last_error` / `last_error_code` including `attempt_cap`.
 *
 * Constants: {@link NOTIFICATION_OUTBOX_ATTEMPT_HARD_CAP}, {@link STALE_NOTIFICATION_PROCESSING_LEASE_MS}.
 *
 * Paths: Postgres `notification_events` only — no SES/Shippo hops from this classifier.
 */

import {
  NOTIFICATION_OUTBOX_ATTEMPT_HARD_CAP,
  STALE_NOTIFICATION_PROCESSING_LEASE_MS,
} from "@/lib/notifications/notificationOutboxConstants";

export type NotificationLifecycleUiState =
  | "pending"
  /** Active single-flight lease on an unprocessed row (another worker owns until stale). */
  | "processing"
  /** Row failed previously; lease released — next cron claims and increments `_process.attempts`. */
  | "failed_retryable"
  | "delivered_success"
  /** Terminal failure before hard cap exhaustion (non-retryable or policy exhausted without cap marker). */
  | "failed_terminal"
  /** Terminal row that hit attempt ceiling / `_process.attempts` bookkeeping cap (`attempt_cap` path). */
  | "dead_letter";

export type NotificationRowLifecycleInput = {
  processedAt: Date | null;
  startedProcessingAt: Date | null;
  createdAt: Date;
  payload: unknown;
};

type ProcessSlice = {
  attempts?: number;
  delivery_attempt?: number;
  lastError?: string;
  lastErrorCode?: string;
  last_provider_message_id?: string | null;
};

function readProcessSlice(payload: unknown): ProcessSlice {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  const meta = (payload as Record<string, unknown>)._process;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  return meta as ProcessSlice;
}

function hasOutboundSuccessEvidence(payload: unknown): boolean {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const r = payload as Record<string, unknown>;
  if (typeof r.provider_message_id === "string" && r.provider_message_id.trim()) return true;
  const pid = readProcessSlice(payload).last_provider_message_id;
  return typeof pid === "string" && pid.trim() !== "";
}

function hasTerminalErrorMarkers(slice: ProcessSlice): boolean {
  return (
    Boolean(slice.lastError && slice.lastError.trim()) ||
    Boolean(slice.lastErrorCode && String(slice.lastErrorCode).trim())
  );
}

/** True when `startedProcessingAt` is within the freshness window (same cutoff as cron lease recovery). */
export function notificationOutboundLeaseIsHeld(startedProcessingAt: Date | null, now: Date): boolean {
  if (!startedProcessingAt) return false;
  return startedProcessingAt.getTime() > now.getTime() - STALE_NOTIFICATION_PROCESSING_LEASE_MS;
}

/** `startedProcessingAt` is non-null AND older than the stale lease cutoff (eligible for Phase A lease clear). */
export function notificationOutboundLeaseIsStaleHeld(startedProcessingAt: Date | null, now: Date): boolean {
  if (!startedProcessingAt) return false;
  return startedProcessingAt.getTime() <= now.getTime() - STALE_NOTIFICATION_PROCESSING_LEASE_MS;
}

/**
 * Rows that exhausted the hard outbound attempt ceiling (≤ {@link NOTIFICATION_OUTBOX_ATTEMPT_HARD_CAP}), including
 * the processor's preempt `attempt_cap` path. Intended for guarded operator rewind (see operator-requeue API).
 */
export function isDeadLetterAttemptCapRow(row: {
  processedAt: Date | null;
  payload: unknown;
}): boolean {
  if (!row.processedAt) return false;
  const slice = readProcessSlice(row.payload);
  if (!hasTerminalErrorMarkers(slice)) return false;
  if (slice.lastErrorCode === "attempt_cap") return true;
  const tries = slice.attempts ?? slice.delivery_attempt ?? 0;
  return tries >= NOTIFICATION_OUTBOX_ATTEMPT_HARD_CAP;
}

/**
 * Maps a persisted row (+ wall clock `now`) to a coarse dashboard state.
 *
 * Caveat: `mergeTerminalSuccessPayload` spreads prior `_process` fields; corroborate borderline terminals with provider ids.
 */
export function deriveNotificationLifecycleState(
  row: NotificationRowLifecycleInput,
  now: Date = new Date()
): NotificationLifecycleUiState {
  const slice = readProcessSlice(row.payload);

  if (!row.processedAt) {
    if (notificationOutboundLeaseIsHeld(row.startedProcessingAt, now)) {
      return "processing";
    }
    if ((slice.attempts ?? slice.delivery_attempt ?? 0) > 0 && hasTerminalErrorMarkers(slice)) {
      return "failed_retryable";
    }
    return "pending";
  }

  if (hasOutboundSuccessEvidence(row.payload)) {
    return "delivered_success";
  }

  if (hasTerminalErrorMarkers(slice)) {
    if (isDeadLetterAttemptCapRow(row)) return "dead_letter";
    return "failed_terminal";
  }

  return "delivered_success";
}
