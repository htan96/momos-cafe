/**
 * Super-admin operational read model: reconciles Postgres `notification_events` with transport bookkeeping
 * and governance audits — without claiming inbox/bounce fidelity this codebase does not persist end-to-end.
 */

/** Rows older than this with `processed_at` null are flagged as abandonment risk (cron/infra starvation), not formal dead-letter state. */
export const COMMUNICATION_ABANDONED_BACKLOG_THRESHOLD_HOURS = 48;

export const COMMUNICATION_TRUTH_TIMELINE_CAP = 24;

/** Hard cap governance audit rows loaded per timeline (then merged + sorted). */
export const COMMUNICATION_OPERATOR_AUDIT_TIMELINE_CAP = 12;

export type ParsedOperatorRequeueMode = "lease_release" | "dead_letter_rewind" | "unknown";

/**
 * Persisted Postgres row is **`processed_at` null** yet at least one **governance OPERATOR_REQUEUE** audit exists (
 * historically cleared a lease — does not mutate terminal rows — or operator touched dead-letter rewind which is surfaced as
 * `post_operator_dead_letter_rewind_pending` separately when that mode is present).
 */
export type OperatorGovernanceCorrelationPendingPhase = {
  kind: "operator_governance_audit_trail_pending";
  lastGovernanceAuditAtIso: string;
  lastMode: ParsedOperatorRequeueMode;
};

/** Discriminated union for the **current persisted operational posture** (single glance). */
export type CommunicationOperationalPhase =
  /** `processed_at` null, `_process` has no terminal error bookkeeping, outbound lease stale or absent. */
  | { kind: "queued"; leaseHeld: boolean }
  /**
   * Same as queued, but **`created_at` older than {@link COMMUNICATION_ABANDONED_BACKLOG_THRESHOLD_HOURS}** from `now`,
   * **`processed_at` still null**, and there is **no fresh single-flight lease** (`started_processing_at` absent or stale).
   * Signals likely scheduler/processor starvation — **not** a processor-classified abandoned state flag in DB.
   */
  | {
      kind: "abandoned_backlog_risk";
      ageHoursRounded: number;
      leaseHeld: boolean;
    }
  /** Fresh single-flight lease (`started_processing_at` inside the staleness horizon used by the outbox processor). */
  | { kind: "leasing_processing" }
  /**
   * Row released lease after recording `_process.lastError` — awaiting next cron pickup (attempts incremented).
   * Aligns with `failed_retryable` in {@link deriveNotificationLifecycleState}.
   */
  | { kind: "awaiting_scheduler_retry"; attemptsApprox: number }
  /**
   * Terminal success with **`provider_message_id` or `_process.last_provider_message_id`**.
   * SES/transport accepted the submit request — **not** receipt at a mailbox and **no** automated bounce disprove signal here unless separately ingested.
   */
  | { kind: "provider_submitted_transport_ack"; providerMessageId: string }
  /**
   * Terminal orchestration treated the row as success but **no persisted transport correlation id**.
   * Common for skeleton / non-email lanes; honest “customer delivery unknown”.
   */
  | { kind: "provider_terminal_success_without_transport_correlation"; notificationTypeHint: string }
  /** Terminal row with surfaced `_process.lastError` / `lastErrorCode`, below attempt-cap / dead-letter bookkeeping. */
  | { kind: "provider_terminal_failed"; lastErrorCode: string | null; lastErrorPreview: string | null }
  /** Attempt-cap bookkeeping (`attempt_cap` or attempts ≥ hard cap heuristic) — rewind is destructive/guarded. */
  | { kind: "dead_letter_attempt_cap"; lastErrorCode: string | null }
  /**
   * Present only when loaders supply governance context: Postgres row is **`processed_at` null** yet a **dead-letter rewind**
   * audit exists for this id (operator reopened after attempt-cap terminal). Operational marker — still pending drain.
   */
  | {
      kind: "post_operator_dead_letter_rewind_pending";
      lastAuditAtIso: string;
      rewindMode: "dead_letter_rewind";
    }
  | OperatorGovernanceCorrelationPendingPhase;

export type GovernanceNotificationOperatorAuditView = {
  id: string;
  createdAt: Date;
  actionType: "OPERATIONS_NOTIFICATION_EVENT_OPERATOR_REQUEUE";
  actorName: string | null;
  description: string | null;
  metadata: unknown;
};

export type CommunicationTimelineEntry =
  | { kind: "notification_created"; atIso: string; label: string }
  | {
      kind: "operator_requeue_audited";
      atIso: string;
      label: string;
      mode: ParsedOperatorRequeueMode;
      actorName: string | null;
      auditId: string;
    }
  | { kind: "processing_lease_observed"; atIso: string; label: string }
  | {
      kind: "payload_attempt_bookkeeping";
      atIso: string;
      label: string;
      attemptsApprox: number | null;
      lastErrorPreview: string | null;
      lastErrorCode: string | null;
    }
  | {
      kind: "terminal_processed";
      atIso: string;
      label: string;
      processed: boolean;
    };

export type CommunicationTruthSampleHistogram = Partial<Record<CommunicationOperationalPhase["kind"], number>>;

export type CommunicationTruthReport = {
  generatedAt: string;
  /** Deduped union of surfaced backlog + terminal samples used for coarse histogram (not a full-table census). */
  sampleRowCountDeduped: number;
  phaseHistogramApprox: CommunicationTruthSampleHistogram;
  /** Rows in the deduped sample with transport id recorded on payload (still: bounce/disposition unknown system-wide). */
  sampleTerminalTransportAckCount: number;
  /** Subset above where payload wording hints suppression/bounces — heuristic only (no SES SNS linkage). */
  sampleTransportAckWithPayloadBounceHintCount: number;
  honestyNotes: readonly string[];
  operatorRequeueAuditCountLast24h: number | null;
  /** Exists when webhook replay audits exist elsewhere — notifications use governance audits only today. */
  replayCorrelationHint: string | null;
};
