/**
 * Shared timing + attempt budgets for `NotificationEvent` outbox processing.
 * Keep aligned with `processNotificationOutbox` + operator tooling.
 *
 * Canonical values: `lib/operations/semantics/constants.ts`.
 */

import {
  OPERATIONAL_NOTIFICATION_OUTBOX_RETRY_MAX_ATTEMPTS,
  OPERATIONAL_NOTIFICATION_OUTBOX_SINGLE_FLIGHT_LEASE_MS,
} from "@/lib/operations/semantics/constants";

export const NOTIFICATION_OUTBOX_ATTEMPT_HARD_CAP = OPERATIONAL_NOTIFICATION_OUTBOX_RETRY_MAX_ATTEMPTS;

/** Max single-flight lease before another worker clears and retries (~15 minutes). */
export const STALE_NOTIFICATION_PROCESSING_LEASE_MS = OPERATIONAL_NOTIFICATION_OUTBOX_SINGLE_FLIGHT_LEASE_MS;
