import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { INCIDENT_TYPES, OPERATIONAL_INCIDENT_ACTIVE_STATUSES } from "@/lib/operations/incidentTypes";

export const DEFAULT_NOTIFICATION_BACKLOG_THRESHOLD = 500;

/** Pure predicate for tests / dashboards — backlog itself is queried by `evaluateNotificationBacklogIncident`. */
export function notificationBacklogExceedsThreshold(unprocessedCount: number, threshold: number): boolean {
  return Number.isFinite(unprocessedCount) && unprocessedCount >= threshold;
}

/**
 * Opens or refreshes **`NOTIFICATION_BACKLOG`** incidents when **`NotificationEvent.processedAt`** stays null beyond threshold counts.
 *
 * Intended for eventual cron/`/internal/health`; safe to leave unwired — **`try/catch`**, never throws.
 *
 * TODO: schedule periodic evaluations once notification workers expose lag metrics externally.
 */
export async function evaluateNotificationBacklogIncident(
  threshold = DEFAULT_NOTIFICATION_BACKLOG_THRESHOLD
): Promise<void> {
  try {
    const unprocessedCount = await prisma.notificationEvent.count({
      where: { processedAt: null },
    });

    if (!notificationBacklogExceedsThreshold(unprocessedCount, threshold)) return;

    const now = new Date();

    const existing = await prisma.operationalIncident.findFirst({
      where: {
        type: INCIDENT_TYPES.NOTIFICATION_BACKLOG,
        status: { in: [...OPERATIONAL_INCIDENT_ACTIVE_STATUSES] },
      },
    });

    const nextMetadata: Record<string, unknown> = {
      rule: INCIDENT_TYPES.NOTIFICATION_BACKLOG,
      threshold,
      unprocessedCount,
      evaluatedAt: now.toISOString(),
    };

    if (existing) {
      const prevMeta =
        existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
          ? { ...(existing.metadata as Record<string, unknown>) }
          : {};
      await prisma.operationalIncident.update({
        where: { id: existing.id },
        data: {
          lastDetectedAt: now,
          metadata: { ...prevMeta, ...nextMetadata } as Prisma.InputJsonValue,
        },
      });
      return;
    }

    await prisma.operationalIncident.create({
      data: {
        type: INCIDENT_TYPES.NOTIFICATION_BACKLOG,
        severity: "warning",
        status: "active",
        title: `Notification backlog exceeded threshold (${unprocessedCount} unprocessed rows)`,
        description: "`NotificationEvent` rows with null `processedAt` crossed the backlog threshold.",
        affectedSystems: ["notifications", "orchestration"],
        firstDetectedAt: now,
        lastDetectedAt: now,
        metadata: nextMetadata as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    console.error("[evaluateNotificationBacklogIncident]", e);
  }
}
