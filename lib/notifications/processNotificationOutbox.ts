import type { Prisma } from "@prisma/client";
import { OperationalActivitySeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import {
  DEFAULT_NOTIFICATION_RETRY_POLICY,
  type NotificationProcessor,
  type ProcessResult,
} from "./processorContract";
import { deliverOutboundEmail } from "@/lib/email/deliverOutboundEmail";
import { notificationTypeSupportsOutboundEmail } from "@/lib/email/notificationEmailBridge";
import {
  NOTIFICATION_OUTBOX_ATTEMPT_HARD_CAP,
  STALE_NOTIFICATION_PROCESSING_LEASE_MS,
} from "./notificationOutboxConstants";

export { NOTIFICATION_OUTBOX_ATTEMPT_HARD_CAP, STALE_NOTIFICATION_PROCESSING_LEASE_MS } from "./notificationOutboxConstants";

/**
 * NotificationEvent lifecycle (`processed_at` terminal, `started_processing_at` lease):
 *
 * **pending** — `processed_at` null, lease clear or stale ⇒ eligible for claiming.
 *
 * **processing** — leased row (`started_processing_at` set and fresh) ⇒ another worker skips until lease expires or work completes.
 *
 * **sent** — `processed_at` set after successful processor result; outbound mail metadata may include `payload.provider_message_id`.
 *
 * **failed** — terminal `processed_at` with `_process.last_error`; retry budget tracked in `_process.attempts` / `_process.delivery_attempt` (≤ `retryPolicy.maxAttempts`).
 */
type ProcessMetadata = {
  attempts?: number;
  /** Mirrors attempts for SES email path visibility / ops dashboards. */
  delivery_attempt?: number;
  processing_started_at?: string;
  lastError?: string;
  lastErrorCode?: string;
  lastAttemptAt?: string;
  last_provider_message_id?: string | null;
};

function readProcessMetadata(payload: unknown): ProcessMetadata {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  const meta = (payload as Record<string, unknown>)._process;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  return meta as ProcessMetadata;
}

function mergeProcessMetadata(payload: unknown, patch: ProcessMetadata): Prisma.InputJsonValue {
  const base =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? { ...(payload as Record<string, unknown>) }
      : {};
  const prev = readProcessMetadata(base);
  return {
    ...base,
    _process: { ...prev, ...patch },
  } as Prisma.InputJsonValue;
}

function mergeTerminalSuccessPayload(
  payload: unknown,
  opts: { attempt: number; nowISO: string; providerMessageId?: string | null }
): Prisma.InputJsonValue {
  const base =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? { ...(payload as Record<string, unknown>) }
      : {};
  const prev = readProcessMetadata(base);
  const out: Record<string, unknown> = {
    ...base,
    _process: {
      ...prev,
      attempts: opts.attempt,
      delivery_attempt: opts.attempt,
      lastAttemptAt: opts.nowISO,
      last_provider_message_id: opts.providerMessageId ?? null,
    },
  };
  if (opts.providerMessageId != null && opts.providerMessageId !== "") {
    out.provider_message_id = opts.providerMessageId;
  }
  return out as Prisma.InputJsonValue;
}

/** Skeleton processor — validates row shape and marks success without external delivery. */
export const skeletonNotificationProcessor: NotificationProcessor = {
  supports: () => true,
  async process(row, ctx): Promise<ProcessResult> {
    if (!row.type.trim()) {
      return {
        ok: false,
        notificationId: row.id,
        retryable: false,
        errorCode: "invalid_type",
        message: "Notification type missing",
      };
    }
    /** Future transactional enqueue → SES directly without internal HTTP hops. */
    if (notificationTypeSupportsOutboundEmail(row.type)) {
      return deliverOutboundEmail(row.id, row.type, row.payload, {
        outboundAttempt: ctx.attempt,
      });
    }
    return { ok: true, notificationId: row.id };
  },
};

export type ProcessNotificationOutboxOptions = {
  limit?: number;
  processor?: NotificationProcessor;
  retryPolicy?: typeof DEFAULT_NOTIFICATION_RETRY_POLICY;
};

export type ProcessNotificationOutboxResult = {
  scanned: number;
  processed: number;
  failed: number;
  deadLettered: number;
  skippedDuplicateLease: number;
};

async function emitProcessFailedEvent(row: { id: string; type: string }, message: string): Promise<void> {
  void emitPlatformEvent({
    subtype: PLATFORM_EVENT_SUBTYPE.SYSTEM_NOTIFICATION_PROCESS_FAILED,
    category: "SYSTEM_EVENT",
    lifecycle: "failed",
    severity: OperationalActivitySeverity.warning,
    actorType: "service",
    message: `Notification outbox processing failed (${row.type})`,
    detail: { notificationId: row.id, type: row.type, error: message },
    sourceTag: "notification-outbox.processor",
    skipIncidentEvaluation: true,
  });
}

async function clearStaleProcessingLocks(cutoff: Date): Promise<void> {
  await prisma.notificationEvent.updateMany({
    where: {
      processedAt: null,
      startedProcessingAt: { lte: cutoff },
    },
    data: { startedProcessingAt: null },
  });
}

async function claimNotificationRow(notificationId: string, now: Date, staleCutoff: Date): Promise<boolean> {
  const res = await prisma.notificationEvent.updateMany({
    where: {
      id: notificationId,
      processedAt: null,
      OR: [{ startedProcessingAt: null }, { startedProcessingAt: { lte: staleCutoff } }],
    },
    data: { startedProcessingAt: now },
  });
  return res.count === 1;
}

/**
 * Selects eligible `NotificationEvent` rows (transactional claiming), runs processor, emits provider ids on outbound success,
 * and writes terminal `processedAt` plus `_process.*` bookkeeping.
 */
export async function processNotificationOutbox(
  opts: ProcessNotificationOutboxOptions = {}
): Promise<ProcessNotificationOutboxResult> {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 25));
  const processor = opts.processor ?? skeletonNotificationProcessor;
  const retryPolicy = opts.retryPolicy ?? DEFAULT_NOTIFICATION_RETRY_POLICY;
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - STALE_NOTIFICATION_PROCESSING_LEASE_MS);

  await clearStaleProcessingLocks(staleCutoff);

  const rows = await prisma.notificationEvent.findMany({
    where: {
      processedAt: null,
      OR: [{ startedProcessingAt: null }, { startedProcessingAt: { lte: staleCutoff } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let processed = 0;
  let failed = 0;
  let deadLettered = 0;
  let skippedDuplicateLease = 0;

  const maxOutboundAttempts = Math.min(NOTIFICATION_OUTBOX_ATTEMPT_HARD_CAP, retryPolicy.maxAttempts);

  for (const row of rows) {
    const meta = readProcessMetadata(row.payload);
    const claimed = await claimNotificationRow(row.id, now, staleCutoff);
    if (!claimed) {
      skippedDuplicateLease += 1;
      continue;
    }

    /** Hard cap persisted attempts (fixed ceiling 5 concurrent with retry policy defaults). */
    if ((meta.attempts ?? 0) >= maxOutboundAttempts) {
      deadLettered += 1;
      await prisma.notificationEvent.update({
        where: { id: row.id },
        data: {
          processedAt: now,
          startedProcessingAt: null,
          payload: mergeProcessMetadata(row.payload, {
            attempts: meta.attempts ?? maxOutboundAttempts,
            delivery_attempt: meta.attempts ?? maxOutboundAttempts,
            lastError: "Retries exhausted (_process.attempts cap)",
            lastErrorCode: "attempt_cap",
            lastAttemptAt: now.toISOString(),
          }),
        },
      });
      continue;
    }

    const attempt = (meta.attempts ?? 0) + 1;

    let result: ProcessResult;
    try {
      result = await processor.process(
        { id: row.id, type: row.type, payload: row.payload, createdAt: row.createdAt },
        { now, attempt }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result = {
        ok: false,
        notificationId: row.id,
        retryable: true,
        errorCode: "processor_exception",
        message,
      };
    }

    if (result.ok) {
      await prisma.notificationEvent.update({
        where: { id: row.id },
        data: {
          processedAt: now,
          startedProcessingAt: null,
          payload: mergeTerminalSuccessPayload(row.payload, {
            attempt,
            nowISO: now.toISOString(),
            providerMessageId: result.providerMessageId ?? null,
          }),
        },
      });
      processed += 1;
      continue;
    }

    failed += 1;
    await emitProcessFailedEvent(row, result.message);

    const exhausted = !result.retryable || attempt >= retryPolicy.maxAttempts;
    if (exhausted) {
      deadLettered += 1;
      await prisma.notificationEvent.update({
        where: { id: row.id },
        data: {
          processedAt: now,
          startedProcessingAt: null,
          payload: mergeProcessMetadata(row.payload, {
            attempts: attempt,
            delivery_attempt: attempt,
            lastError: result.message,
            lastErrorCode: result.errorCode,
            lastAttemptAt: now.toISOString(),
          }),
        },
      });
    } else {
      await prisma.notificationEvent.update({
        where: { id: row.id },
        data: {
          /** Release lease — next cron pass retries with incremented attempt counter persisted after failure bookkeeping. */
          startedProcessingAt: null,
          payload: mergeProcessMetadata(row.payload, {
            attempts: attempt,
            delivery_attempt: attempt,
            lastError: result.message,
            lastErrorCode: result.errorCode,
            lastAttemptAt: now.toISOString(),
          }),
        },
      });
    }
  }

  return { scanned: rows.length, processed, failed, deadLettered, skippedDuplicateLease };
}