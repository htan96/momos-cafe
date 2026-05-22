/**
 * Read-only parsing of persisted `NotificationEvent.payload` for super-admin ops visibility.
 *
 * Provider message ids mirror what `mergeTerminalSuccessPayload` / outbound paths stamp — they imply
 * SES (or downstream) acceptance of the submit request, not that a human opened the mail.
 */

import {
  deriveNotificationLifecycleState,
  type NotificationLifecycleUiState,
  type NotificationRowLifecycleInput,
} from "@/lib/super-admin/notifications/deriveNotificationLifecycleState";
import {
  extractNotificationProviderMessageId,
  notificationPayloadSuggestBounceSignal,
} from "@/lib/super-admin/notifications/communicationTruth/mapProviderTruth";

/** Super-admin-facing delivery lane (narrower than full lifecycle states). */
export type NotificationExtendedDeliveryUiLabel =
  | "queued"
  | "processing"
  /** Terminal success where we have a persisted transport id on the orchestration payload. */
  | "provider_submitted"
  /**
   * Terminal success without transport id on payload — common for skeleton / non-email types; for delegated
   * email types (`email.transactional.*`) this deserves follow-up unless the row predates SES metadata.
   */
  | "accepted_without_provider_id"
  /** Outbound delegated types only: last attempt surfaced a structured failure prior to terminal success/dead-letter. */
  | "provider_failed"
  /** Hard-cap / explicit `attempt_cap` terminal bookkeeping. */
  | "terminal_dead_letter";

export type NotificationDeliverySignals = {
  /** SES / outbound transport id mirrored onto JSON when wired (root `provider_message_id` or `_process.last_provider_message_id`). */
  providerMessageId: string | null;
  /**
   * Heuristic: `_process.lastError` / `lastErrorCode` text matches common bounce/suppression wording.
   * True SES SNS bounce → datastore linkage is not implemented; stubs only emit timeline events — see readiness panel.
   */
  hasKnownBounceSignal: boolean;
  extendedLabel: NotificationExtendedDeliveryUiLabel;
  lifecycleState: NotificationLifecycleUiState;
};

function mapLifecycleToExtendedLabel(lifecycle: NotificationLifecycleUiState, providerMessageId: string | null): NotificationExtendedDeliveryUiLabel {
  switch (lifecycle) {
    case "pending":
      return "queued";
    case "processing":
      return "processing";
    case "dead_letter":
      return "terminal_dead_letter";
    case "failed_retryable":
    case "failed_terminal":
      return "provider_failed";
    case "delivered_success":
      if (providerMessageId) return "provider_submitted";
      return "accepted_without_provider_id";
    default:
      return "accepted_without_provider_id";
  }
}

/**
 * Stable read model for dashboards / tables — no IO, no retries.
 */
export function deriveNotificationDeliverySignals(
  row: NotificationRowLifecycleInput & { type: string },
  now: Date = new Date()
): NotificationDeliverySignals {
  const lifecycle = deriveNotificationLifecycleState(row, now);
  const providerMessageId = extractNotificationProviderMessageId(row.payload);
  return {
    providerMessageId,
    hasKnownBounceSignal: notificationPayloadSuggestBounceSignal(row.payload),
    extendedLabel: mapLifecycleToExtendedLabel(lifecycle, providerMessageId),
    lifecycleState: lifecycle,
  };
}

export { extractNotificationProviderMessageId, notificationPayloadSuggestBounceSignal };
