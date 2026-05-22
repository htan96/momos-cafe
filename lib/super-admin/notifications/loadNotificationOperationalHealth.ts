/**
 * Consolidated Postgres reads for `/super-admin/operations/notifications-health`.
 *
 * Operational honesty: aggregates are eventual — latency samples use the latest N processed terminals only,
 * not a full-table median (except the explicit `throughput.avgLagProcessedLast24hMs` rollup).
 */

import type { NotificationEvent } from "@prisma/client";
import type { NotificationLifecycleUiState } from "@/lib/super-admin/notifications/deriveNotificationLifecycleState";
import { deriveNotificationLifecycleState } from "@/lib/super-admin/notifications/deriveNotificationLifecycleState";
import {
  deriveNotificationDeliverySignals,
  type NotificationDeliverySignals,
} from "@/lib/super-admin/notifications/notificationDeliverySignals";
import type { CommunicationTruthReport } from "@/lib/super-admin/notifications/communicationTruth/types";
import { reportCommunicationTruthFromOperationalSnapshot } from "@/lib/super-admin/notifications/communicationTruth/reportCommunicationTruth";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { INTEGRATION_SYSTEM_KEYS } from "@/lib/operations/integrationHealth/types";
import {
  OPERATIONAL_NOTIFICATION_HEALTH_DAY_WINDOW_MS,
  OPERATIONAL_NOTIFICATION_HEALTH_PENDING_FRESH_WINDOW_MS,
  OPERATIONAL_NOTIFICATION_HEALTH_THIRTY_DAY_WINDOW_MS,
} from "@/lib/operations/semantics/constants";
import { prisma } from "@/lib/prisma";

const LATENCY_SAMPLE_CAP = 200;
const RECENT_LIST_CAP = 35;
const BACKLOG_SAMPLE_CAP = 40;

export type NotificationBacklogBuckets = {
  /** `processed_at` null, queued &lt; 1h ago by `created_at`. */
  pendingUnderOneHour: number;
  /** `processed_at` null, created between 1h and 24h ago. */
  pendingOneHourToTwentyFourHours: number;
  /** `processed_at` null, older than 24h. */
  pendingOverTwentyFourHours: number;
};

export type NotificationLatencySampleSummary = {
  sampleSize: number;
  avgLagMs: number | null;
  maxLagMs: number | null;
};

export type NotificationOperationalRowView = Pick<
  NotificationEvent,
  "id" | "type" | "payload" | "processedAt" | "startedProcessingAt" | "createdAt"
>;

export type NotificationOperationalRowViewWithSignals = NotificationOperationalRowView & {
  deliverySignals: NotificationDeliverySignals;
};

export type TerminalErrorCodeBucket = {
  /** Stable bucketing helper — prefixes `lastErrorCode` before falling back to a trimmed `lastError` slice. */
  substringKey: string;
  count: number;
};

/** Email row keyed by notification outbox idempotency pattern `notif-<uuid>:attempt-N`. */
export type NotificationCorrelationHealthSignals = {
  /** Outbound `EmailMessage` rows tied to notifications that failed SES persistence in the trailing window (transport/config). */
  outboundNotifKeyedEmailFailuresLast24h: number;
};

export type SesNotificationStubSignals = {
  /** `OperationalActivityEvent` rows emitted by authenticated stub only — not production bounce ingestion. */
  bounceStubOperationalEventsLast24h: number;
};

export type GovernanceOperatorTouchSignals = {
  /** Rows on `GovernanceAuditEvent` (lease clear + guarded dead-letter rewind). */
  operatorNotificationRequeuesLast24h: number;
};

export type CronFreshnessSignals = {
  /**
   * `IntegrationHealthSnapshot` rows sampled for proxy freshness — **`notification-outbox` does not persist its own cron heartbeat**.
   * When absent, callers should steer operators to infra schedulers / logs instead of blaming Postgres aggregates.
   */
  notificationOutboxCronHeartbeatInDb: false;
  proxyEmailProbeLastSuccessAtIso: string | null;
  proxyInternalApiHealthLastSuccessAtIso: string | null;
};

export type WebhookSesReceiptSignals = {
  /** Receipt rows whose `provider` contains `ses` (case-insensitive) — correlate carefully with SES notify vs inbound mail routes. */
  sesLabelledWebhookReceiptsLast30d: number;
};

export type NotificationDeliveryReliabilityReport = {
  /** Terminal completions with timestamps in `[now-24h, now]` (successful + exhausted failures). */
  processedLast24h: number;
  /** Rows with terminal `processed_at`, no persisted `_process.last*Error*` markers, plus provider-id bookkeeping when stamping succeeded. */
  terminalRowsWithPersistedProviderMessageId: number;
  terminalFailureBuckets: TerminalErrorCodeBucket[];
  deadLetterAttemptCapRows: number;
  throughputAvgLagProcessedLast24hMs: number | null;
  correlation: NotificationCorrelationHealthSignals;
  sesNotificationStubSignals: SesNotificationStubSignals;
  governanceTouches: GovernanceOperatorTouchSignals;
  cronFreshness: CronFreshnessSignals;
  webhookSesReceiptSignals: WebhookSesReceiptSignals;
};

export type NotificationOperationalHealthSnapshot = {
  generatedAt: string;
  backlog: NotificationBacklogBuckets;
  backlogSample: NotificationOperationalRowViewWithSignals[];
  recentTerminalFailures: Array<
    NotificationOperationalRowViewWithSignals & {
      lifecycleState: Extract<NotificationLifecycleUiState, "failed_terminal" | "dead_letter">;
    }
  >;
  recentSuccesses: NotificationOperationalRowViewWithSignals[];
  latency: NotificationLatencySampleSummary;
  reliability: NotificationDeliveryReliabilityReport;
  communicationTruth: CommunicationTruthReport;
};

function attachDeliverySignals(row: NotificationOperationalRowView, now: Date): NotificationOperationalRowViewWithSignals {
  return {
    ...row,
    deliverySignals: deriveNotificationDeliverySignals(row, now),
  };
}

async function loadReliability(now: Date, twentyFourHoursAgo: Date, thirtyDaysAgo: Date): Promise<NotificationDeliveryReliabilityReport> {
  const [
    processedScan,
    providerIdCountRow,
    errorBucketsRows,
    deadLetterAttemptCapScan,
    lagAvgRow,
    outboundEmailKeyedFailuresLast24h,
    bounceStubCount,
    govRequeueCount,
    integrationSnaps,
    sesReceiptCount,
  ] = await Promise.all([
    prisma.notificationEvent.count({
      where: { processedAt: { gte: twentyFourHoursAgo, lte: now } },
    }),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM notification_events
      WHERE processed_at IS NOT NULL
        AND NULLIF(TRIM(payload #>> '{_process,lastError}'),'') IS NULL
        AND NULLIF(TRIM(payload #>> '{_process,lastErrorCode}'),'') IS NULL
        AND (
          NULLIF(TRIM(payload->>'provider_message_id'),'') IS NOT NULL
          OR NULLIF(TRIM(payload #>> '{_process,last_provider_message_id}'),'') IS NOT NULL
        )
    `,
    prisma.$queryRaw<Array<{ substringKey: string; cnt: number }>>`
      SELECT LEFT(
               COALESCE(
                 NULLIF(UPPER(TRIM(payload #>> '{_process,lastErrorCode}')),''),
                 SUBSTRING(COALESCE(NULLIF(TRIM(payload #>> '{_process,lastError}'),''), '?'), 1, 56)
               ),
               72
             ) AS "substringKey",
             COUNT(*)::int AS cnt
      FROM notification_events
      WHERE processed_at IS NOT NULL
        AND NULLIF(TRIM(payload #>> '{_process,lastError}'),'') IS NOT NULL
      GROUP BY 1
      ORDER BY cnt DESC
      LIMIT 5
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM notification_events
      WHERE processed_at IS NOT NULL
        AND payload #>> '{_process,lastErrorCode}' = ${"attempt_cap"}
    `,
    prisma.$queryRaw<Array<{ avg_ms: number | null }>>`
      SELECT
        ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) * 1000)::double precision AS avg_ms
      FROM notification_events
      WHERE processed_at IS NOT NULL
        AND processed_at >= ${twentyFourHoursAgo}
        AND processed_at <= ${now}
    `,
    prisma.emailMessage.count({
      where: {
        direction: "outbound",
        deliveryStatus: "failed",
        idempotencyKey: { startsWith: "notif-" },
        createdAt: { gte: twentyFourHoursAgo },
      },
    }),
    prisma.operationalActivityEvent.count({
      where: {
        type: PLATFORM_EVENT_SUBTYPE.SYSTEM_EMAIL_BOUNCE_STUB_RECEIVED,
        createdAt: { gte: twentyFourHoursAgo },
      },
    }),
    prisma.governanceAuditEvent.count({
      where: {
        actionType: "OPERATIONS_NOTIFICATION_EVENT_OPERATOR_REQUEUE",
        createdAt: { gte: twentyFourHoursAgo },
      },
    }),
    prisma.integrationHealthSnapshot.findMany({
      where: {
        systemKey: { in: [INTEGRATION_SYSTEM_KEYS.EMAIL, INTEGRATION_SYSTEM_KEYS.INTERNAL_API] },
      },
      select: { systemKey: true, lastSuccessfulCheckAt: true },
    }),
    prisma.webhookDeliveryReceipt.count({
      where: {
        provider: { contains: "ses", mode: "insensitive" },
        receivedAt: { gte: thirtyDaysAgo },
      },
    }),
  ]);

  const emailSnap = integrationSnaps.find((s) => s.systemKey === INTEGRATION_SYSTEM_KEYS.EMAIL) ?? null;
  const apiSnap = integrationSnaps.find((s) => s.systemKey === INTEGRATION_SYSTEM_KEYS.INTERNAL_API) ?? null;

  const terminalFailureBuckets = errorBucketsRows.map((row) => ({
    substringKey: row.substringKey.trim() === "" ? "<empty_bucket>" : row.substringKey.trim(),
    count: row.cnt,
  }));

  return {
    processedLast24h: processedScan,
    terminalRowsWithPersistedProviderMessageId: Number(providerIdCountRow[0]?.count ?? 0),
    terminalFailureBuckets,
    deadLetterAttemptCapRows: Number(deadLetterAttemptCapScan[0]?.count ?? 0),
    throughputAvgLagProcessedLast24hMs:
      typeof lagAvgRow[0]?.avg_ms === "number" && Number.isFinite(lagAvgRow[0]!.avg_ms) ? lagAvgRow[0]!.avg_ms : null,
    correlation: { outboundNotifKeyedEmailFailuresLast24h: outboundEmailKeyedFailuresLast24h },
    sesNotificationStubSignals: { bounceStubOperationalEventsLast24h: bounceStubCount },
    governanceTouches: { operatorNotificationRequeuesLast24h: govRequeueCount },
    cronFreshness: {
      notificationOutboxCronHeartbeatInDb: false,
      proxyEmailProbeLastSuccessAtIso: emailSnap?.lastSuccessfulCheckAt?.toISOString() ?? null,
      proxyInternalApiHealthLastSuccessAtIso: apiSnap?.lastSuccessfulCheckAt?.toISOString() ?? null,
    },
    webhookSesReceiptSignals: {
      sesLabelledWebhookReceiptsLast30d: sesReceiptCount,
    },
  };
}

export async function loadNotificationOperationalHealth(now: Date = new Date()): Promise<NotificationOperationalHealthSnapshot> {
  const oneHourAgo = new Date(now.getTime() - OPERATIONAL_NOTIFICATION_HEALTH_PENDING_FRESH_WINDOW_MS);
  const twentyFourHoursAgo = new Date(now.getTime() - OPERATIONAL_NOTIFICATION_HEALTH_DAY_WINDOW_MS);
  const thirtyDaysAgo = new Date(now.getTime() - OPERATIONAL_NOTIFICATION_HEALTH_THIRTY_DAY_WINDOW_MS);

  const [
    pendingUnderOneHour,
    pendingOneHourToTwentyFourHours,
    pendingOverTwentyFourHours,
    backlogSample,
    recentProcessedScan,
    reliability,
  ] = await Promise.all([
    prisma.notificationEvent.count({
      where: { processedAt: null, createdAt: { gte: oneHourAgo } },
    }),
    prisma.notificationEvent.count({
      where: {
        processedAt: null,
        AND: [{ createdAt: { lt: oneHourAgo } }, { createdAt: { gte: twentyFourHoursAgo } }],
      },
    }),
    prisma.notificationEvent.count({
      where: { processedAt: null, createdAt: { lt: twentyFourHoursAgo } },
    }),
    prisma.notificationEvent.findMany({
      where: { processedAt: null },
      select: {
        id: true,
        type: true,
        payload: true,
        processedAt: true,
        startedProcessingAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
      take: BACKLOG_SAMPLE_CAP,
    }),
    prisma.notificationEvent.findMany({
      where: { processedAt: { not: null } },
      orderBy: { processedAt: "desc" },
      take: LATENCY_SAMPLE_CAP,
      select: {
        id: true,
        type: true,
        payload: true,
        processedAt: true,
        startedProcessingAt: true,
        createdAt: true,
      },
    }),
    loadReliability(now, twentyFourHoursAgo, thirtyDaysAgo),
  ]);

  const recentTerminalFailures: NotificationOperationalHealthSnapshot["recentTerminalFailures"] = [];
  const recentSuccesses: NotificationOperationalRowViewWithSignals[] = [];

  const latencySlice = recentProcessedScan.slice(0, LATENCY_SAMPLE_CAP);
  const deltas = latencySlice.map((row) => row.processedAt!.getTime() - row.createdAt.getTime());
  let avgLagMs: number | null = null;
  let maxLagMs: number | null = null;
  if (deltas.length) {
    maxLagMs = Math.max(...deltas);
    avgLagMs = Math.round(deltas.reduce((acc, cur) => acc + cur, 0) / deltas.length);
  }

  for (const row of recentProcessedScan) {
    const lifecycle = deriveNotificationLifecycleState(row, now);
    if (lifecycle === "failed_terminal" || lifecycle === "dead_letter") {
      if (recentTerminalFailures.length < RECENT_LIST_CAP) {
        recentTerminalFailures.push({
          ...attachDeliverySignals(row, now),
          lifecycleState: lifecycle,
        });
      }
    }
    if (lifecycle === "delivered_success") {
      if (recentSuccesses.length < RECENT_LIST_CAP) {
        recentSuccesses.push(attachDeliverySignals(row, now));
      }
    }
    if (recentTerminalFailures.length >= RECENT_LIST_CAP && recentSuccesses.length >= RECENT_LIST_CAP) break;
  }

  const backlogSampleWithSignals = backlogSample.map((row) => attachDeliverySignals(row, now));
  const communicationTruth = await reportCommunicationTruthFromOperationalSnapshot(
    {
      backlogSample: backlogSampleWithSignals,
      recentTerminalFailures,
      recentSuccesses,
      reliability,
    },
    now
  );

  return {
    generatedAt: now.toISOString(),
    backlog: {
      pendingUnderOneHour,
      pendingOneHourToTwentyFourHours,
      pendingOverTwentyFourHours,
    },
    backlogSample: backlogSampleWithSignals,
    recentTerminalFailures,
    recentSuccesses,
    latency: {
      sampleSize: deltas.length,
      avgLagMs,
      maxLagMs,
    },
    reliability,
    communicationTruth,
  };
}
