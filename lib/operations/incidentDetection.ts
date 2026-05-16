import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { INCIDENT_TYPES, OPERATIONAL_INCIDENT_ACTIVE_STATUSES } from "@/lib/operations/incidentTypes";
import { OPERATIONAL_EVENT_TYPES, type OperationalEventType } from "@/lib/operations/operationalEventTypes";

/** Count of `payment.failed` events in the sliding window that opens an incident. */
export const PAYMENT_FAILURE_THRESHOLD = 5;

/** Sliding window for payment-failure spike detection. */
export const WINDOW_MS = 2 * 60 * 1000;

function asStringArrayJson(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function mergeUniqueStrings(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}

/**
 * Applies incident rules that depend on a recent sliding window of `OperationalActivityEvent` rows.
 * Invoked asynchronously after unrelated payment events may have landed in the DB.
 */
export async function evaluateIncidentRulesForRecentWindow(
  triggeredEventId: string,
  eventType: OperationalEventType
): Promise<void> {
  if (eventType === OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED) {
    await detectPaymentFailureSpike(triggeredEventId);
  }
}

/** Fire-and-forget hook after `OperationalActivityEvent` insert — never throws. */
export function recordOperationalEventSideEffects(eventId: string | null, eventType: OperationalEventType): void {
  if (!eventId) return;
  setImmediate(() => {
    void evaluateIncidentRulesForRecentWindow(eventId, eventType).catch((err) =>
      console.error("[recordOperationalEventSideEffects]", eventType, err)
    );
  });
}

async function detectPaymentFailureSpike(_triggeredEventId: string): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  const events = await prisma.operationalActivityEvent.findMany({
    where: {
      type: OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED,
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true },
    take: 500,
  });

  if (events.length < PAYMENT_FAILURE_THRESHOLD) return;

  const ids = events.map((e) => e.id);

  const existing = await prisma.operationalIncident.findFirst({
    where: {
      type: INCIDENT_TYPES.PAYMENT_FAILURE_SPIKE,
      status: { in: [...OPERATIONAL_INCIDENT_ACTIVE_STATUSES] },
    },
  });

  const title = `Payment failure spike (${PAYMENT_FAILURE_THRESHOLD}+ failures in ${WINDOW_MS / 60_000} minutes)`;

  const nextMetadata: Record<string, unknown> = {
    rule: INCIDENT_TYPES.PAYMENT_FAILURE_SPIKE,
    windowMs: WINDOW_MS,
    threshold: PAYMENT_FAILURE_THRESHOLD,
    observedCount: events.length,
    windowStart: windowStart.toISOString(),
    windowEvaluatedAt: now.toISOString(),
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
        sourceEventIds: mergeUniqueStrings(asStringArrayJson(existing.sourceEventIds), ids) as Prisma.InputJsonValue,
      },
    });
    return;
  }

  await prisma.operationalIncident.create({
    data: {
      type: INCIDENT_TYPES.PAYMENT_FAILURE_SPIKE,
      severity: "high",
      status: "active",
      title,
      description: `${events.length} payment failure events detected within the surveillance window.`,
      affectedSystems: ["payments", "square"],
      firstDetectedAt: events[0]?.createdAt ?? now,
      lastDetectedAt: now,
      metadata: nextMetadata as Prisma.InputJsonValue,
      sourceEventIds: ids as Prisma.InputJsonValue,
    },
  });
}

/** No-op stub — persisted incidents in phase 1 follow `OperationalActivityEvent` detectors only. */
export async function evaluateIntegrationHealthIncidents(
  _snapshot: { systemKey: string; currentStatus: string; metadata?: unknown },
  _previous: { currentStatus: string } | null
): Promise<void> {
  void _snapshot;
  void _previous;
}