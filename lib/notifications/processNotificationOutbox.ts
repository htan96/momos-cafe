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

type ProcessMetadata = {
  attempts?: number;
  lastError?: string;
  lastErrorCode?: string;
  lastAttemptAt?: string;
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

/** Skeleton processor — validates row shape and marks success without external delivery. */
export const skeletonNotificationProcessor: NotificationProcessor = {
  supports: () => true,
  async process(row): Promise<ProcessResult> {
    if (!row.type.trim()) {
      return {
        ok: false,
        notificationId: row.id,
        retryable: false,
        errorCode: "invalid_type",
        message: "Notification type missing",
      };
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

/**
 * Selects unprocessed `NotificationEvent` rows, runs the processor, marks `processedAt` on success,
 * and increments retry metadata on failure.
 */
export async function processNotificationOutbox(
  opts: ProcessNotificationOutboxOptions = {}
): Promise<ProcessNotificationOutboxResult> {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 25));
  const processor = opts.processor ?? skeletonNotificationProcessor;
  const retryPolicy = opts.retryPolicy ?? DEFAULT_NOTIFICATION_RETRY_POLICY;
  const now = new Date();

  const rows = await prisma.notificationEvent.findMany({
    where: { processedAt: null },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let processed = 0;
  let failed = 0;
  let deadLettered = 0;

  for (const row of rows) {
    const meta = readProcessMetadata(row.payload);
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
          payload: mergeProcessMetadata(row.payload, {
            attempts: attempt,
            lastAttemptAt: now.toISOString(),
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
          payload: mergeProcessMetadata(row.payload, {
            attempts: attempt,
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
          payload: mergeProcessMetadata(row.payload, {
            attempts: attempt,
            lastError: result.message,
            lastErrorCode: result.errorCode,
            lastAttemptAt: now.toISOString(),
          }),
        },
      });
    }
  }

  return { scanned: rows.length, processed, failed, deadLettered };
}
