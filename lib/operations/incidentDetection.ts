import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  INCIDENT_TYPES,
  OPERATIONAL_INCIDENT_ACTIVE_STATUSES,
} from "@/lib/operations/incidentTypes";
import { evaluateNotificationBacklogIncident } from "@/lib/operations/notificationBacklogIncident";
import { INTEGRATION_SYSTEM_KEYS } from "@/lib/operations/integrationHealth/types";
import { OPERATIONAL_EVENT_TYPES, type OperationalEventType } from "@/lib/operations/operationalEventTypes";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";

/** Count of `payment.failed` events in the sliding window that opens an incident (legacy spike). */
export const PAYMENT_FAILURE_THRESHOLD = 5;

/** Sliding window for payment-failure spike detection (legacy Square terminal failures). */
export const PAYMENT_SPIKE_WINDOW_MS = 2 * 60 * 1000;

export const AUTH_FAILURE_THRESHOLD = 12;
export const SHIPPO_OUTAGE_THRESHOLD = 6;
export const WEBHOOK_FAILURE_LOOP_THRESHOLD = 8;

/** Shared window — kept intentionally short to emphasize acute spikes without noisy pages. */
export const OPERATIONAL_RULE_WINDOW_MS = 3 * 60 * 1000;

export const EMAIL_FAILURE_WINDOW_THRESHOLD = 5;
export const EMAIL_FAILURE_WINDOW_MS = OPERATIONAL_RULE_WINDOW_MS;

export const WEBHOOK_FAILURE_TYPES = [
  PLATFORM_EVENT_SUBTYPE.PAYMENT_WEBHOOK_PROCESSING_FAILED,
  PLATFORM_EVENT_SUBTYPE.SECURITY_WEBHOOK_SIGNATURE_INVALID,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_WEBHOOK_PROCESSING_FAILED,
] as const;

export const SHIPPO_OPS_TYPES = [
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_QUOTE_FAILED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_LABEL_FAILED,
] as const;

function asStringArrayJson(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function mergeUniqueStrings(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}

async function slidingWindowOperationalEventRows(args: {
  types: readonly string[];
  windowMs: number;
  limit?: number;
}) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - args.windowMs);
  const events = await prisma.operationalActivityEvent.findMany({
    where: {
      type: { in: [...args.types] },
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true },
    take: args.limit ?? 600,
  });
  return { now, windowStart, events };
}

async function upsertRollingWindowIncident(opts: {
  type: string;
  title: string;
  descriptionSeed: string;
  affectedSystems: string[];
  windowMs: number;
  threshold: number;
  ids: string[];
  now: Date;
  windowStart: Date;
  firstDetectedAt?: Date;
  extraMetadata?: Record<string, unknown>;
}): Promise<void> {
  if (opts.ids.length < opts.threshold) return;

  const existing = await prisma.operationalIncident.findFirst({
    where: {
      type: opts.type,
      status: { in: [...OPERATIONAL_INCIDENT_ACTIVE_STATUSES] },
    },
  });

  const nextMetadata: Record<string, unknown> = {
    rule: opts.type,
    windowMs: opts.windowMs,
    threshold: opts.threshold,
    observedCount: opts.ids.length,
    windowStart: opts.windowStart.toISOString(),
    windowEvaluatedAt: opts.now.toISOString(),
    ...(opts.extraMetadata ?? {}),
  };

  if (existing) {
    const prevMeta =
      existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
        ? { ...(existing.metadata as Record<string, unknown>) }
        : {};

    await prisma.operationalIncident.update({
      where: { id: existing.id },
      data: {
        lastDetectedAt: opts.now,
        metadata: { ...prevMeta, ...nextMetadata } as Prisma.InputJsonValue,
        sourceEventIds: mergeUniqueStrings(asStringArrayJson(existing.sourceEventIds), opts.ids) as Prisma.InputJsonValue,
      },
    });
    return;
  }

  await prisma.operationalIncident.create({
    data: {
      type: opts.type,
      severity: "warning",
      status: "active",
      title: opts.title,
      description: `${opts.descriptionSeed} (${opts.ids.length}+ events detected within surveillance window.)`,
      affectedSystems: opts.affectedSystems,
      firstDetectedAt: opts.firstDetectedAt ?? opts.windowStart,
      lastDetectedAt: opts.now,
      metadata: nextMetadata as Prisma.InputJsonValue,
      sourceEventIds: opts.ids as Prisma.InputJsonValue,
    },
  });
}

async function detectPaymentFailureSpike(triggeredEventId: string): Promise<void> {
  const windowStart = new Date(Date.now() - PAYMENT_SPIKE_WINDOW_MS);

  const events = await prisma.operationalActivityEvent.findMany({
    where: {
      type: OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED,
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true },
    take: 500,
  });

  const now = new Date();
  await upsertRollingWindowIncident({
    type: INCIDENT_TYPES.PAYMENT_FAILURE_SPIKE,
    title: `Payment failure spike (${PAYMENT_FAILURE_THRESHOLD}+ failures in ${PAYMENT_SPIKE_WINDOW_MS / 60_000} minutes)`,
    descriptionSeed: "Square payment failures crossed the spike threshold",
    affectedSystems: ["payments", "square"],
    windowMs: PAYMENT_SPIKE_WINDOW_MS,
    threshold: PAYMENT_FAILURE_THRESHOLD,
    ids: events.map((e) => e.id),
    now,
    windowStart,
    firstDetectedAt: events[0]?.createdAt ?? now,
    extraMetadata: {
      triggeringEventSampleId: triggeredEventId,
      eventKind: OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED,
    },
  });
}

async function detectAuthFailureSpike(): Promise<void> {
  const { now, windowStart, events } = await slidingWindowOperationalEventRows({
    types: [PLATFORM_EVENT_SUBTYPE.AUTH_LOGIN_FAILED],
    windowMs: OPERATIONAL_RULE_WINDOW_MS,
  });

  await upsertRollingWindowIncident({
    type: INCIDENT_TYPES.AUTH_FAILURE_SPIKE,
    title: `Auth login failure spike (${AUTH_FAILURE_THRESHOLD}+ in ${OPERATIONAL_RULE_WINDOW_MS / 60_000} minutes)`,
    descriptionSeed: "Cognito/password login failures clustered",
    affectedSystems: ["auth", "cognito"],
    windowMs: OPERATIONAL_RULE_WINDOW_MS,
    threshold: AUTH_FAILURE_THRESHOLD,
    ids: events.map((e) => e.id),
    now,
    windowStart,
    firstDetectedAt: events[0]?.createdAt ?? now,
  });
}

async function detectShippoOutagePattern(): Promise<void> {
  const { now, windowStart, events } = await slidingWindowOperationalEventRows({
    types: SHIPPO_OPS_TYPES,
    windowMs: OPERATIONAL_RULE_WINDOW_MS,
  });

  await upsertRollingWindowIncident({
    type: INCIDENT_TYPES.SHIPPO_OUTAGE,
    title: `Ship operations spike (${SHIPPO_OUTAGE_THRESHOLD}+ quote/label failures in ${OPERATIONAL_RULE_WINDOW_MS / 60_000} minutes)`,
    descriptionSeed: "Shippo quote or purchase-label pathways failing repeatedly",
    affectedSystems: ["shippo", "shipping"],
    windowMs: OPERATIONAL_RULE_WINDOW_MS,
    threshold: SHIPPO_OUTAGE_THRESHOLD,
    ids: events.map((e) => e.id),
    now,
    windowStart,
    firstDetectedAt: events[0]?.createdAt ?? now,
  });
}

async function detectWebhookFailureLoop(): Promise<void> {
  const { now, windowStart, events } = await slidingWindowOperationalEventRows({
    types: WEBHOOK_FAILURE_TYPES,
    windowMs: OPERATIONAL_RULE_WINDOW_MS,
  });

  await upsertRollingWindowIncident({
    type: INCIDENT_TYPES.WEBHOOK_FAILURE_LOOP,
    title: `Inbound webhook anomaly (${WEBHOOK_FAILURE_LOOP_THRESHOLD}+ failures in ${OPERATIONAL_RULE_WINDOW_MS / 60_000} minutes)`,
    descriptionSeed: "PSP / shipping webhook signatures or reconcile handlers failing repetitively",
    affectedSystems: ["square", "shippo", "webhooks"],
    windowMs: OPERATIONAL_RULE_WINDOW_MS,
    threshold: WEBHOOK_FAILURE_LOOP_THRESHOLD,
    ids: events.map((e) => e.id),
    now,
    windowStart,
    firstDetectedAt: events[0]?.createdAt ?? now,
  });
}

/*
 * Applies incident rules that depend on a recent sliding window of `OperationalActivityEvent` rows.
 * Invoked asynchronously after unrelated events may have landed in the DB.
 */
export async function evaluateIncidentRulesForRecentWindow(
  triggeredEventId: string,
  eventType: OperationalEventType
): Promise<void> {
  if (eventType === OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED) {
    await detectPaymentFailureSpike(triggeredEventId);
  }

  const authTypes: OperationalEventType[] = [PLATFORM_EVENT_SUBTYPE.AUTH_LOGIN_FAILED];
  if (authTypes.includes(eventType)) {
    await detectAuthFailureSpike();
  }

  const shippoTypes = SHIPPO_OPS_TYPES as readonly OperationalEventType[];
  if ((shippoTypes as readonly string[]).includes(eventType)) {
    await detectShippoOutagePattern();
  }

  const webhookLoopTypes = WEBHOOK_FAILURE_TYPES as readonly OperationalEventType[];
  if ((webhookLoopTypes as readonly string[]).includes(eventType)) {
    await detectWebhookFailureLoop();
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

async function upsertIntegrationDegradedIncident(opts: {
  systemKey: string;
  severityLabel: string;
  now: Date;
  fromStatus: string;
  toStatus: string;
  detailMeta?: Record<string, unknown>;
}): Promise<void> {
  const existing = await prisma.operationalIncident.findFirst({
    where: {
      type: INCIDENT_TYPES.INTEGRATION_DEGRADED,
      status: { in: [...OPERATIONAL_INCIDENT_ACTIVE_STATUSES] },
      metadata: { path: ["systemKey"], equals: opts.systemKey },
    },
  });

  const payload: Record<string, unknown> = {
    rule: INCIDENT_TYPES.INTEGRATION_DEGRADED,
    systemKey: opts.systemKey,
    fromStatus: opts.fromStatus,
    toStatus: opts.toStatus,
    detectedAt: opts.now.toISOString(),
    ...(opts.detailMeta ?? {}),
  };

  if (existing) {
    const prevMeta =
      existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
        ? { ...(existing.metadata as Record<string, unknown>) }
        : {};
    await prisma.operationalIncident.update({
      where: { id: existing.id },
      data: {
        lastDetectedAt: opts.now,
        metadata: { ...prevMeta, ...payload } as Prisma.InputJsonValue,
      },
    });
    return;
  }

  await prisma.operationalIncident.create({
    data: {
      type: INCIDENT_TYPES.INTEGRATION_DEGRADED,
      severity: opts.severityLabel === "offline" ? "critical" : "high",
      status: "investigating",
      title: `${opts.systemKey} integration degraded (${opts.fromStatus} → ${opts.toStatus})`,
      description: `Health snapshot transitioned from healthy baseline to ${opts.toStatus}`,
      affectedSystems: [opts.systemKey],
      firstDetectedAt: opts.now,
      lastDetectedAt: opts.now,
      metadata: payload as Prisma.InputJsonValue,
    },
  });
}

/**
 * Emits **`system.integration.degraded`** and opens an **`OperationalIncident`** when a previously healthy probe turns unhealthy.
 * Does **not** fan into spike detectors (`skipIncidentEvaluation`).
 */
export async function evaluateIntegrationHealthIncidents(
  snapshot: { systemKey: string; currentStatus: string; metadata?: unknown },
  previous: { currentStatus: string } | null
): Promise<void> {
  try {
    const degraded =
      snapshot.currentStatus === "degraded" ||
      snapshot.currentStatus === "offline";

    if (!degraded || previous?.currentStatus !== "healthy") {
      return;
    }

    const now = new Date();

    await upsertIntegrationDegradedIncident({
      systemKey: snapshot.systemKey,
      severityLabel: snapshot.currentStatus,
      now,
      fromStatus: previous.currentStatus,
      toStatus: snapshot.currentStatus,
      detailMeta: {
        probeMetadataKeys:
          snapshot.metadata && typeof snapshot.metadata === "object"
            ? Object.keys(snapshot.metadata as object)
            : undefined,
      },
    });
  } catch (e) {
    console.error("[evaluateIntegrationHealthIncidents]", snapshot.systemKey, e);
  }
}

async function resolveIncidentByType(type: string, resolutionNotes: string): Promise<void> {
  const open = await prisma.operationalIncident.findFirst({
    where: { type, status: { in: [...OPERATIONAL_INCIDENT_ACTIVE_STATUSES] } },
  });
  if (!open) return;
  const now = new Date();
  await prisma.operationalIncident.update({
    where: { id: open.id },
    data: {
      status: "resolved",
      resolvedAt: now,
      lastDetectedAt: now,
      resolutionNotes,
    },
  });
}

/** Clears an open `INTEGRATION_DEGRADED` incident when a probe returns healthy. */
export async function resolveIntegrationDegradedIncident(systemKey: string): Promise<void> {
  try {
    const open = await prisma.operationalIncident.findFirst({
      where: {
        type: INCIDENT_TYPES.INTEGRATION_DEGRADED,
        status: { in: [...OPERATIONAL_INCIDENT_ACTIVE_STATUSES] },
        metadata: { path: ["systemKey"], equals: systemKey },
      },
    });
    if (!open) return;
    const now = new Date();
    await prisma.operationalIncident.update({
      where: { id: open.id },
      data: {
        status: "resolved",
        resolvedAt: now,
        lastDetectedAt: now,
        resolutionNotes: `${systemKey} integration probe returned healthy`,
      },
    });
  } catch (e) {
    console.error("[resolveIntegrationDegradedIncident]", systemKey, e);
  }
}

async function evaluateEmailDeliveryDegradedIncident(): Promise<void> {
  const emailSnapshot = await prisma.integrationHealthSnapshot.findUnique({
    where: { systemKey: INTEGRATION_SYSTEM_KEYS.EMAIL },
  });

  const emailUnhealthy =
    emailSnapshot?.currentStatus === "degraded" || emailSnapshot?.currentStatus === "offline";

  const { now, windowStart, events } = await slidingWindowOperationalEventRows({
    types: [PLATFORM_EVENT_SUBTYPE.SYSTEM_EMAIL_SEND_FAILED],
    windowMs: EMAIL_FAILURE_WINDOW_MS,
  });

  const repeatedFailures = events.length >= EMAIL_FAILURE_WINDOW_THRESHOLD;
  const shouldOpen = emailUnhealthy || repeatedFailures;

  if (!shouldOpen) {
    await resolveIncidentByType(
      INCIDENT_TYPES.EMAIL_DELIVERY_DEGRADED,
      "Email probe healthy and send-failure window below threshold"
    );
    return;
  }

  const existing = await prisma.operationalIncident.findFirst({
    where: {
      type: INCIDENT_TYPES.EMAIL_DELIVERY_DEGRADED,
      status: { in: [...OPERATIONAL_INCIDENT_ACTIVE_STATUSES] },
    },
  });

  const nextMetadata: Record<string, unknown> = {
    rule: INCIDENT_TYPES.EMAIL_DELIVERY_DEGRADED,
    windowMs: EMAIL_FAILURE_WINDOW_MS,
    threshold: EMAIL_FAILURE_WINDOW_THRESHOLD,
    observedCount: events.length,
    emailProbeStatus: emailSnapshot?.currentStatus ?? "unknown",
    emailUnhealthy,
    repeatedFailures,
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
        sourceEventIds: mergeUniqueStrings(asStringArrayJson(existing.sourceEventIds), events.map((e) => e.id)) as Prisma.InputJsonValue,
      },
    });
    return;
  }

  await prisma.operationalIncident.create({
    data: {
      type: INCIDENT_TYPES.EMAIL_DELIVERY_DEGRADED,
      severity: emailUnhealthy ? "high" : "warning",
      status: "active",
      title: `Email delivery degraded (${emailUnhealthy ? "provider probe unhealthy" : `${EMAIL_FAILURE_WINDOW_THRESHOLD}+ send failures`})`,
      description: "Outbound email subsystem degraded — probe or repeated send failures detected.",
      affectedSystems: ["email", "notifications"],
      firstDetectedAt: events[0]?.createdAt ?? now,
      lastDetectedAt: now,
      metadata: nextMetadata as Prisma.InputJsonValue,
      sourceEventIds: events.map((e) => e.id) as Prisma.InputJsonValue,
    },
  });
}

async function resolveSpikeIncidentsWhenCalm(): Promise<void> {
  const now = new Date();

  const authWindow = new Date(now.getTime() - OPERATIONAL_RULE_WINDOW_MS);
  const authCount = await prisma.operationalActivityEvent.count({
    where: { type: PLATFORM_EVENT_SUBTYPE.AUTH_LOGIN_FAILED, createdAt: { gte: authWindow } },
  });
  if (authCount < AUTH_FAILURE_THRESHOLD) {
    await resolveIncidentByType(
      INCIDENT_TYPES.AUTH_FAILURE_SPIKE,
      `Auth failures (${authCount}) below threshold (${AUTH_FAILURE_THRESHOLD})`
    );
  }

  const shippoCount = await prisma.operationalActivityEvent.count({
    where: { type: { in: [...SHIPPO_OPS_TYPES] }, createdAt: { gte: authWindow } },
  });
  if (shippoCount < SHIPPO_OUTAGE_THRESHOLD) {
    await resolveIncidentByType(
      INCIDENT_TYPES.SHIPPO_OUTAGE,
      `Shippo failures (${shippoCount}) below threshold (${SHIPPO_OUTAGE_THRESHOLD})`
    );
  }

  const webhookCount = await prisma.operationalActivityEvent.count({
    where: { type: { in: [...WEBHOOK_FAILURE_TYPES] }, createdAt: { gte: authWindow } },
  });
  if (webhookCount < WEBHOOK_FAILURE_LOOP_THRESHOLD) {
    await resolveIncidentByType(
      INCIDENT_TYPES.WEBHOOK_FAILURE_LOOP,
      `Webhook failures (${webhookCount}) below threshold (${WEBHOOK_FAILURE_LOOP_THRESHOLD})`
    );
  }

  const paymentWindow = new Date(now.getTime() - PAYMENT_SPIKE_WINDOW_MS);
  const paymentCount = await prisma.operationalActivityEvent.count({
    where: { type: OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED, createdAt: { gte: paymentWindow } },
  });
  if (paymentCount < PAYMENT_FAILURE_THRESHOLD) {
    await resolveIncidentByType(
      INCIDENT_TYPES.PAYMENT_FAILURE_SPIKE,
      `Payment failures (${paymentCount}) below threshold (${PAYMENT_FAILURE_THRESHOLD})`
    );
  }
}

async function resolveNotificationBacklogWhenCalm(threshold = 500): Promise<void> {
  const unprocessedCount = await prisma.notificationEvent.count({ where: { processedAt: null } });
  if (unprocessedCount >= threshold) return;
  await resolveIncidentByType(
    INCIDENT_TYPES.NOTIFICATION_BACKLOG,
    `Notification backlog (${unprocessedCount}) below threshold (${threshold})`
  );
}

/**
 * Batch incident evaluators for cron / health probes — spike windows, backlog, email degradation.
 */
export async function evaluateAllScheduledIncidentRules(): Promise<void> {
  try {
    await Promise.all([
      detectAuthFailureSpike(),
      detectShippoOutagePattern(),
      detectWebhookFailureLoop(),
      evaluateNotificationBacklogIncident(),
      evaluateEmailDeliveryDegradedIncident(),
    ]);

    const paymentWindow = new Date(Date.now() - PAYMENT_SPIKE_WINDOW_MS);
    const paymentEvents = await prisma.operationalActivityEvent.findMany({
      where: { type: OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED, createdAt: { gte: paymentWindow } },
      orderBy: { createdAt: "asc" },
      select: { id: true, createdAt: true },
      take: 500,
    });
    if (paymentEvents.length > 0) {
      await upsertRollingWindowIncident({
        type: INCIDENT_TYPES.PAYMENT_FAILURE_SPIKE,
        title: `Payment failure spike (${PAYMENT_FAILURE_THRESHOLD}+ failures in ${PAYMENT_SPIKE_WINDOW_MS / 60_000} minutes)`,
        descriptionSeed: "Square payment failures crossed the spike threshold",
        affectedSystems: ["payments", "square"],
        windowMs: PAYMENT_SPIKE_WINDOW_MS,
        threshold: PAYMENT_FAILURE_THRESHOLD,
        ids: paymentEvents.map((e) => e.id),
        now: new Date(),
        windowStart: paymentWindow,
        firstDetectedAt: paymentEvents[0]?.createdAt ?? new Date(),
      });
    }

    await resolveSpikeIncidentsWhenCalm();
    await resolveNotificationBacklogWhenCalm();
  } catch (e) {
    console.error("[evaluateAllScheduledIncidentRules]", e);
  }
}
