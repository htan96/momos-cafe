import type { Prisma } from "@prisma/client";
import { OperationalActivitySeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  evaluateAllScheduledIncidentRules,
  evaluateIntegrationHealthIncidents,
  resolveIntegrationDegradedIncident,
} from "@/lib/operations/incidentDetection";
import {
  runIntegrationHealthChecks,
  type IntegrationHealthCheckResult,
} from "@/lib/operations/integrationHealth/runIntegrationHealthChecks";
import type { IntegrationHealthStatus } from "@/lib/operations/integrationHealth/types";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";

/** Latency above this threshold while probe succeeds emits `system.integration.slow_response`. */
export const INTEGRATION_SLOW_RESPONSE_MS = 3500;

const RECOVERING_WINDOW_MS = 10 * 60 * 1000;

function truncateError(message: string, max = 500): string {
  if (message.length <= max) return message;
  return `${message.slice(0, Math.max(0, max - 1))}…`;
}

function isUnhealthy(status: string): boolean {
  return status === "degraded" || status === "offline";
}

function derivePersistedStatus(
  result: IntegrationHealthCheckResult,
  previous: { currentStatus: string; metadata?: unknown } | null
): IntegrationHealthStatus {
  if (result.currentStatus === "healthy" && previous && isUnhealthy(previous.currentStatus)) {
    return "recovering";
  }
  return result.currentStatus;
}

async function emitIntegrationTransitionEvents(args: {
  result: IntegrationHealthCheckResult;
  previous: { currentStatus: string } | null;
  persistedStatus: IntegrationHealthStatus;
}): Promise<void> {
  const { result, previous, persistedStatus } = args;
  const prev = previous?.currentStatus ?? null;
  const nowHealthy = result.currentStatus === "healthy";
  const nowUnhealthy = isUnhealthy(result.currentStatus);

  if (prev === "healthy" && result.currentStatus === "degraded") {
    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.SYSTEM_INTEGRATION_DEGRADED,
      category: "SYSTEM_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.error,
      actorType: "service",
      message: `Integration health degraded for ${result.systemKey}`,
      detail: {
        systemKey: result.systemKey,
        fromStatus: prev,
        toStatus: result.currentStatus,
        latencyMs: result.latencyMs,
      },
      sourceTag: "integration-health.probe",
      skipIncidentEvaluation: true,
    });
  }

  if (prev === "healthy" && result.currentStatus === "offline") {
    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.SYSTEM_INTEGRATION_OFFLINE,
      category: "SYSTEM_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.critical,
      actorType: "service",
      message: `Integration offline: ${result.systemKey}`,
      detail: {
        systemKey: result.systemKey,
        fromStatus: prev,
        toStatus: result.currentStatus,
        lastErrorMessage: result.lastErrorMessage,
      },
      sourceTag: "integration-health.probe",
      skipIncidentEvaluation: true,
    });
  }

  if (prev && isUnhealthy(prev) && nowHealthy) {
    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.SYSTEM_INTEGRATION_RECOVERED,
      category: "SYSTEM_EVENT",
      lifecycle: "succeeded",
      severity: OperationalActivitySeverity.info,
      actorType: "service",
      message: `Integration recovered: ${result.systemKey}`,
      detail: {
        systemKey: result.systemKey,
        fromStatus: prev,
        toStatus: persistedStatus,
        latencyMs: result.latencyMs,
      },
      sourceTag: "integration-health.probe",
      skipIncidentEvaluation: true,
    });
    await resolveIntegrationDegradedIncident(result.systemKey);
  }

  if (
    nowHealthy &&
    result.latencyMs != null &&
    result.latencyMs >= INTEGRATION_SLOW_RESPONSE_MS
  ) {
    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.SYSTEM_INTEGRATION_SLOW_RESPONSE,
      category: "SYSTEM_EVENT",
      lifecycle: "processing",
      severity: OperationalActivitySeverity.warning,
      actorType: "service",
      message: `Slow integration response: ${result.systemKey} (${result.latencyMs} ms)`,
      detail: {
        systemKey: result.systemKey,
        latencyMs: result.latencyMs,
        thresholdMs: INTEGRATION_SLOW_RESPONSE_MS,
      },
      sourceTag: "integration-health.probe",
      skipIncidentEvaluation: true,
    });
  }

  if (nowUnhealthy && prev === "healthy") {
    await evaluateIntegrationHealthIncidents(
      {
        systemKey: result.systemKey,
        currentStatus: result.currentStatus,
        metadata: result.metadata ?? undefined,
      },
      previous
    );
  }
}

async function persistSnapshot(result: IntegrationHealthCheckResult): Promise<void> {
  const now = new Date();
  const previous = await prisma.integrationHealthSnapshot.findUnique({
    where: { systemKey: result.systemKey },
  });

  const persistedStatus = derivePersistedStatus(result, previous);
  const isSuccess = result.currentStatus === "healthy";
  const isFailed = isUnhealthy(result.currentStatus);

  const metadata: Record<string, unknown> = {
    ...(result.metadata ?? {}),
    transitionState: persistedStatus === "recovering" ? "recovering" : undefined,
    recoveringUntil:
      persistedStatus === "recovering"
        ? new Date(now.getTime() + RECOVERING_WINDOW_MS).toISOString()
        : undefined,
    measuredStatus: result.currentStatus,
  };

  await prisma.integrationHealthSnapshot.upsert({
    where: { systemKey: result.systemKey },
    create: {
      systemKey: result.systemKey,
      category: result.category,
      currentStatus: persistedStatus,
      latencyMs: result.latencyMs,
      failureRate: null,
      lastSuccessfulCheckAt: isSuccess ? now : null,
      lastFailedCheckAt: isFailed ? now : null,
      lastErrorMessage: isSuccess
        ? null
        : result.lastErrorMessage
          ? truncateError(result.lastErrorMessage)
          : null,
      metadata: metadata as Prisma.InputJsonValue,
    },
    update: {
      category: result.category,
      currentStatus:
        persistedStatus === "recovering" && previous?.currentStatus === "recovering"
          ? result.currentStatus === "healthy"
            ? "healthy"
            : persistedStatus
          : persistedStatus,
      latencyMs: result.latencyMs,
      failureRate: null,
      ...(isSuccess
        ? {
            lastSuccessfulCheckAt: now,
            lastErrorMessage: null,
          }
        : {}),
      ...(isFailed
        ? {
            lastFailedCheckAt: now,
            lastErrorMessage: result.lastErrorMessage ? truncateError(result.lastErrorMessage) : null,
          }
        : {}),
      ...(result.currentStatus === "unknown"
        ? {
            lastErrorMessage: result.lastErrorMessage ? truncateError(result.lastErrorMessage) : null,
          }
        : {}),
      metadata: metadata as Prisma.InputJsonValue,
    },
  });

  await emitIntegrationTransitionEvents({
    result,
    previous: previous ? { currentStatus: previous.currentStatus } : null,
    persistedStatus,
  });
}

export type EvaluateAndPersistHealthResult = {
  results: IntegrationHealthCheckResult[];
  evaluatedAt: string;
};

/**
 * Runs integration probes, persists snapshots (with recovering transitions), emits platform events,
 * and evaluates scheduled incident rules (backlog, spikes, email degradation).
 */
export async function evaluateAndPersistHealth(): Promise<EvaluateAndPersistHealthResult> {
  const results = await runIntegrationHealthChecks();
  for (const result of results) {
    await persistSnapshot(result);
  }
  await evaluateAllScheduledIncidentRules();
  return { results, evaluatedAt: new Date().toISOString() };
}
