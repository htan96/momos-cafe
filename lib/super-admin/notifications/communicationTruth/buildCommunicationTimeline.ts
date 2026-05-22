import type { NotificationEvent } from "@prisma/client";

import type { CommunicationTimelineEntry, GovernanceNotificationOperatorAuditView } from "@/lib/super-admin/notifications/communicationTruth/types";
import { COMMUNICATION_TRUTH_TIMELINE_CAP } from "@/lib/super-admin/notifications/communicationTruth/types";
import {
  parseGovernanceOperatorRequeueMode,
  readLatestAttemptFingerprint,
} from "@/lib/super-admin/notifications/communicationTruth/mapProviderTruth";
import { deriveNotificationLifecycleState } from "@/lib/super-admin/notifications/deriveNotificationLifecycleState";

type RowShape = Pick<
  NotificationEvent,
  "id" | "type" | "payload" | "processedAt" | "startedProcessingAt" | "createdAt"
>;

function parseIsoMs(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

type Sortable = CommunicationTimelineEntry & { _ms: number; _tie: number };

const TIE_KEYS: CommunicationTimelineEntry["kind"][] = [
  "notification_created",
  "operator_requeue_audited",
  "processing_lease_observed",
  "payload_attempt_bookkeeping",
  "terminal_processed",
];

function tieBreak(kind: CommunicationTimelineEntry["kind"]): number {
  const idx = TIE_KEYS.indexOf(kind);
  return idx === -1 ? 99 : idx;
}

/**
 * Stitch a **best-effort, single-row observability artifact** — Postgres retains only latest `_process` mirrors, so attempt history is inherently lossy.
 */
export function buildCommunicationTimeline(
  row: RowShape,
  audits: readonly GovernanceNotificationOperatorAuditView[],
  opts: {
    generatedAtIso: string;
    now?: Date;
  }
): CommunicationTimelineEntry[] {
  const now = opts.now ?? new Date(opts.generatedAtIso);

  const lifecycle = deriveNotificationLifecycleState(row, now);
  const lifecycleForLabel =
    lifecycle === "delivered_success"
      ? "delivered_success (transport/inbox fidelity not asserted by classifier alone)"
      : lifecycle;

  const out: Sortable[] = [];

  out.push({
    kind: "notification_created",
    atIso: row.createdAt.toISOString(),
    label: `Notification Event created (${row.type})`,
    _ms: row.createdAt.getTime(),
    _tie: tieBreak("notification_created"),
  });

  for (const a of audits) {
    const mode = parseGovernanceOperatorRequeueMode(a.metadata);
    const modeLabel = mode === "lease_release" ? "lease_release" : mode === "dead_letter_rewind" ? "dead_letter_rewind" : "unknown_mode";
    out.push({
      kind: "operator_requeue_audited",
      atIso: a.createdAt.toISOString(),
      label: `Governance audit · OPERATIONS_NOTIFICATION_EVENT_OPERATOR_REQUEUE · ${modeLabel}`,
      mode,
      actorName: a.actorName,
      auditId: a.id,
      _ms: a.createdAt.getTime(),
      _tie: tieBreak("operator_requeue_audited"),
    });
  }

  if (row.startedProcessingAt) {
    out.push({
      kind: "processing_lease_observed",
      atIso: row.startedProcessingAt.toISOString(),
      label: "Observed `started_processing_at` snapshot (single-flight lease marker — may clear without row update on read)",
      _ms: row.startedProcessingAt.getTime(),
      _tie: tieBreak("processing_lease_observed"),
    });
  }

  const fp = readLatestAttemptFingerprint(row.payload);
  const attemptMs = parseIsoMs(fp.lastAttemptAtIso);
  if (attemptMs != null) {
    out.push({
      kind: "payload_attempt_bookkeeping",
      atIso: fp.lastAttemptAtIso!,
      label: "Latest `_process.lastAttemptAt` bookkeeping (only the last attempt is retained in JSON)",
      attemptsApprox: fp.attemptsApprox,
      lastErrorPreview: fp.lastErrorPreview,
      lastErrorCode: fp.lastErrorCode,
      _ms: attemptMs,
      _tie: tieBreak("payload_attempt_bookkeeping"),
    });
  }

  const procIso = row.processedAt?.toISOString() ?? null;
  const procMs = row.processedAt ? row.processedAt.getTime() : null;
  if (procIso && procMs != null) {
    out.push({
      kind: "terminal_processed",
      atIso: procIso,
      label: `Terminal \`processed_at\` set — lifecycle classifier: ${lifecycleForLabel}`,
      processed: true,
      _ms: procMs,
      _tie: tieBreak("terminal_processed"),
    });
  }

  out.sort((a, b) => {    if (a._ms !== b._ms) return a._ms - b._ms;
    return a._tie - b._tie;
  });

  const trimmed = out.slice(0, COMMUNICATION_TRUTH_TIMELINE_CAP);

  return trimmed.map(({ _ms: _m, _tie: _t, ...rest }) => rest);
}
