/**
 * Aggregation helpers for Notifications Health — sample-bounded honesty (not a census over `notification_events`).
 */

import type {
  CommunicationTruthReport,
  CommunicationTruthSampleHistogram,
  GovernanceNotificationOperatorAuditView,
  CommunicationOperationalPhase,
  CommunicationTimelineEntry,
} from "@/lib/super-admin/notifications/communicationTruth/types";
import { COMMUNICATION_OPERATOR_AUDIT_TIMELINE_CAP } from "@/lib/super-admin/notifications/communicationTruth/types";
import { resolveCommunicationOperationalPhase } from "@/lib/super-admin/notifications/communicationTruth/resolveCommunicationOperationalPhase";
import {
  buildProviderCommunicationTruth,
  extractNotificationProviderMessageId,
  type ProviderCommunicationTruth,
} from "@/lib/super-admin/notifications/communicationTruth/mapProviderTruth";
import { buildCommunicationTimeline } from "@/lib/super-admin/notifications/communicationTruth/buildCommunicationTimeline";
import { prisma } from "@/lib/prisma";

const GOVERNANCE_AUDIT_FETCH_CAP = 400;

type TruthHydratedRow = {
  id: string;
  type: string;
  payload: unknown;
  processedAt: Date | null;
  startedProcessingAt: Date | null;
  createdAt: Date;
};

function bump(h: CommunicationTruthSampleHistogram, kind: keyof CommunicationTruthSampleHistogram): void {
  h[kind] = (h[kind] ?? 0) + 1;
}

export async function loadGovernanceOperatorRequeueAuditsForNotificationIds(
  ids: string[]
): Promise<Map<string, GovernanceNotificationOperatorAuditView[]>> {
  const map = new Map<string, GovernanceNotificationOperatorAuditView[]>();
  if (ids.length === 0) return map;

  const rows = await prisma.governanceAuditEvent.findMany({
    where: {
      actionType: "OPERATIONS_NOTIFICATION_EVENT_OPERATOR_REQUEUE",
      targetType: "notification_event",
      targetId: { in: ids },
    },
    select: {
      id: true,
      createdAt: true,
      actionType: true,
      actorName: true,
      description: true,
      metadata: true,
      targetId: true,
    },
    orderBy: { createdAt: "asc" },
    take: GOVERNANCE_AUDIT_FETCH_CAP,
  });

  for (const r of rows) {
    if (!r.targetId) continue;
    const view: GovernanceNotificationOperatorAuditView = {
      id: r.id,
      createdAt: r.createdAt,
      actionType: "OPERATIONS_NOTIFICATION_EVENT_OPERATOR_REQUEUE",
      actorName: r.actorName,
      description: r.description,
      metadata: r.metadata,
    };
    const cur = map.get(r.targetId) ?? [];
    cur.push(view);
    map.set(r.targetId, cur);
  }
  return map;
}

/**
 * Merges backlog + terminal samples (deduped by id) into a phase histogram + transport/bounce-honesty counters.
 */
export async function reportCommunicationTruthFromOperationalSnapshot(
  snapshot: {
    backlogSample: TruthHydratedRow[];
    recentTerminalFailures: TruthHydratedRow[];
    recentSuccesses: TruthHydratedRow[];
    reliability: { governanceTouches: { operatorNotificationRequeuesLast24h: number } };
  },
  now: Date = new Date()
): Promise<CommunicationTruthReport> {
  const combined: TruthHydratedRow[] = [];
  const seen = new Set<string>();
  for (const r of snapshot.backlogSample) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    combined.push(r);
  }
  for (const r of snapshot.recentTerminalFailures) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    combined.push(r);
  }
  for (const r of snapshot.recentSuccesses) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    combined.push(r);
  }

  const auditMap = await loadGovernanceOperatorRequeueAuditsForNotificationIds(combined.map((r) => r.id));

  const histogram: CommunicationTruthSampleHistogram = {};
  let transportAckCount = 0;
  let transportAckBounceHint = 0;

  for (const row of combined) {
    const phase = resolveCommunicationOperationalPhase(row, now, {
      audits: auditMap.get(row.id) ?? [],
    });
    bump(histogram, phase.kind);

    if (extractNotificationProviderMessageId(row.payload)) {
      transportAckCount += 1;
      const t = buildProviderCommunicationTruth(row.payload);
      if (t.bounceHintFromPayloadTextOnly) transportAckBounceHint += 1;
    }
  }

  return {
    generatedAt: now.toISOString(),
    sampleRowCountDeduped: combined.length,
    phaseHistogramApprox: histogram,
    sampleTerminalTransportAckCount: transportAckCount,
    sampleTransportAckWithPayloadBounceHintCount: transportAckBounceHint,
    honestyNotes: [
      "Phase histogram merges backlog FIFO sample + capped recent terminal successes/failures — not a warehouse-wide rollup.",
      "Rows with persisted provider message IDs reflect transport acknowledgement of outbound submission — bounce / inbox / complaint ingestion is stub-only unless operator correlates consoles manually.",
      "When payload text hints suppression, that is a heuristic on `_process` strings — not SNS bounce plumbing.",
    ],
    operatorRequeueAuditCountLast24h: snapshot.reliability.governanceTouches.operatorNotificationRequeuesLast24h,
    replayCorrelationHint:
      "Webhook replay audits live under `OperationalWebhookReplayAudit` — notification operator actions use `GovernanceAuditEvent` only (see timeline / runbook).",
  };
}

export type CommunicationTruthInspectionBundle = {
  notificationId: string;
  phase: CommunicationOperationalPhase;
  providerTruth: ProviderCommunicationTruth;
  timeline: CommunicationTimelineEntry[];
  governanceAudits: Array<{
    id: string;
    createdAtIso: string;
    actorName: string | null;
    description: string | null;
    mode: string;
  }>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Detail view for Notifications Health (`?inspect=<uuid>`). Read-only Postgres + capped governance audits.
 */
export async function loadCommunicationTruthInspectionBundle(
  notificationId: string,
  now: Date = new Date()
): Promise<{ ok: false; reason: "not_found" | "bad_id" } | { ok: true; bundle: CommunicationTruthInspectionBundle }> {
  if (!UUID_RE.test(notificationId)) return { ok: false, reason: "bad_id" };

  const row = await prisma.notificationEvent.findUnique({
    where: { id: notificationId },
    select: {
      id: true,
      type: true,
      payload: true,
      processedAt: true,
      startedProcessingAt: true,
      createdAt: true,
    },
  });

  if (!row) return { ok: false, reason: "not_found" };

  const auditMap = await loadGovernanceOperatorRequeueAuditsForNotificationIds([notificationId]);
  const fullAudits = auditMap.get(notificationId) ?? [];

  const sliceStart = Math.max(0, fullAudits.length - COMMUNICATION_OPERATOR_AUDIT_TIMELINE_CAP);
  const auditsForTimeline = fullAudits.slice(sliceStart);

  const timeline = buildCommunicationTimeline(row, auditsForTimeline, { generatedAtIso: now.toISOString(), now });

  const phase = resolveCommunicationOperationalPhase(
    {
      processedAt: row.processedAt,
      startedProcessingAt: row.startedProcessingAt,
      createdAt: row.createdAt,
      payload: row.payload,
      id: row.id,
      type: row.type,
    },
    now,
    { audits: fullAudits }
  );

  const govSerial = fullAudits.map((a) => {
    const meta =
      typeof a.metadata === "object" && a.metadata !== null ? (a.metadata as Record<string, unknown>) : {};
    return {
      id: a.id,
      createdAtIso: a.createdAt.toISOString(),
      actorName: a.actorName,
      description: a.description,
      mode: typeof meta.mode === "string" ? meta.mode : "unknown",
    };
  });

  return {
    ok: true,
    bundle: {
      notificationId,
      phase,
      providerTruth: buildProviderCommunicationTruth(row.payload),
      timeline,
      governanceAudits: govSerial,
    },
  };
}