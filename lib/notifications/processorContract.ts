import {
  OPERATIONAL_NOTIFICATION_OUTBOX_RETRY_BASE_DELAY_MS,
  OPERATIONAL_NOTIFICATION_OUTBOX_RETRY_MAX_ATTEMPTS,
} from "@/lib/operations/semantics/constants";

/** Retry policy for notification outbox processing. */
export type NotificationRetryPolicy = {
  maxAttempts: number;
  /** Base delay before retry (ms); processors may apply exponential backoff. */
  baseDelayMs: number;
};

/** Result of processing a single notification row. */
export type ProcessResult =
  | {
      ok: true;
      notificationId: string;
      /** SES / provider id when delegated channel surfaced one (surfaced onto NotificationEvent payload). */
      providerMessageId?: string | null;
    }
  | { ok: false; notificationId: string; retryable: boolean; errorCode: string; message: string };

/** Dead-letter shape when retries are exhausted. */
export type NotificationDeadLetter = {
  notificationId: string;
  type: string;
  attempts: number;
  lastError: string;
  failedAt: string;
  payload: unknown;
};

export type NotificationProcessorContext = {
  now: Date;
  attempt: number;
};

/**
 * Pluggable processor contract — real channel workers (email, SMS, etc.) implement this.
 * The skeleton processor marks rows processed without sending mail.
 */
export type NotificationProcessor = {
  /** Returns true when this processor owns the notification `type`. */
  supports(type: string): boolean;
  process(
    row: { id: string; type: string; payload: unknown; createdAt: Date },
    ctx: NotificationProcessorContext
  ): Promise<ProcessResult>;
};

export const DEFAULT_NOTIFICATION_RETRY_POLICY: NotificationRetryPolicy = {
  maxAttempts: OPERATIONAL_NOTIFICATION_OUTBOX_RETRY_MAX_ATTEMPTS,
  baseDelayMs: OPERATIONAL_NOTIFICATION_OUTBOX_RETRY_BASE_DELAY_MS,
};
