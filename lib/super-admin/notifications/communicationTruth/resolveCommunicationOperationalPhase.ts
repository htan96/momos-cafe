import {
  deriveNotificationLifecycleState,
  type NotificationLifecycleUiState,
  type NotificationRowLifecycleInput,
} from "@/lib/super-admin/notifications/deriveNotificationLifecycleState";
import type { GovernanceNotificationOperatorAuditView, CommunicationOperationalPhase } from "@/lib/super-admin/notifications/communicationTruth/types";
import { COMMUNICATION_ABANDONED_BACKLOG_THRESHOLD_HOURS } from "@/lib/super-admin/notifications/communicationTruth/types";
import {
  extractNotificationProviderMessageId,
  readNotificationPayloadProcessSlice,
} from "@/lib/super-admin/notifications/communicationTruth/mapProviderTruth";

type ResolutionInput =
  NotificationRowLifecycleInput & {
    id?: string;
    type: string;
  };

export type OperationalPhaseGovernanceHints = {
  /** Descending audits for this NotificationEvent — optional to avoid churn in hot paths */
  audits?: readonly GovernanceNotificationOperatorAuditView[];
};

/** Core mapper — loaders + timelines should funnel through this helper to prevent drift vs lifecycle classifier. */
export function resolveCommunicationOperationalPhase(
  row: ResolutionInput,
  now: Date,
  hints: OperationalPhaseGovernanceHints = {}
): CommunicationOperationalPhase {
  const lc: NotificationLifecycleUiState = deriveNotificationLifecycleState(row, now);
  const slice = readNotificationPayloadProcessSlice(row.payload);
  const attemptsApproxRaw = slice.attempts ?? slice.delivery_attempt;
  const attemptsApprox =
    typeof attemptsApproxRaw === "number" && Number.isFinite(attemptsApproxRaw) ?
      attemptsApproxRaw
    : 0;

  if (!row.processedAt) {
    if (lc === "processing") {
      return { kind: "leasing_processing" };
    }
    if (lc === "failed_retryable") {
      return { kind: "awaiting_scheduler_retry", attemptsApprox };
    }

    const audits = hints.audits ?? [];
    const latestAudit = audits.reduce<GovernanceNotificationOperatorAuditView | null>((acc, cur) => {
      if (!acc || cur.createdAt.getTime() > acc.createdAt.getTime()) return cur;
      return acc;
    }, null);

    const latestMeta =
      latestAudit && typeof latestAudit.metadata === "object" && latestAudit.metadata !== null ?
        (latestAudit.metadata as Record<string, unknown>)
      : null;
    const latestModeRaw = latestMeta?.mode;

    /**
     * Treat rewind as dominating only when **the freshest governance audit** is the destructive rewind itself — older rewind
     * rows remain visible in the stitched timeline without overriding newer operator actions.
     */
    if (lc === "pending" && latestAudit && latestModeRaw === "dead_letter_rewind") {
      return {
        kind: "post_operator_dead_letter_rewind_pending",
        lastAuditAtIso: latestAudit.createdAt.toISOString(),
        rewindMode: "dead_letter_rewind",
      };
    }

    const ageMs = now.getTime() - row.createdAt.getTime();
    const ageHoursRounded = Math.max(1, Math.round(ageMs / (60 * 60 * 1000)));
    if (
      COMMUNICATION_ABANDONED_BACKLOG_THRESHOLD_HOURS > 0
      && ageMs >= COMMUNICATION_ABANDONED_BACKLOG_THRESHOLD_HOURS * 60 * 60 * 1000
    ) {
      return { kind: "abandoned_backlog_risk", ageHoursRounded, leaseHeld: false };
    }

    if (latestAudit) {
      const meta = typeof latestAudit.metadata === "object" && latestAudit.metadata !== null ? (latestAudit.metadata as Record<string, unknown>) : {};
      const modeRaw = meta.mode;
      const lastMode =
        modeRaw === "lease_release" ? ("lease_release" as const)
        : modeRaw === "dead_letter_rewind" ? ("dead_letter_rewind" as const)
        : ("unknown" as const);
      return {
        kind: "operator_governance_audit_trail_pending",
        lastGovernanceAuditAtIso: latestAudit.createdAt.toISOString(),
        lastMode,
      };
    }

    return { kind: "queued", leaseHeld: false };
  }

  const providerMessageId = extractNotificationProviderMessageId(row.payload);

  if (providerMessageId) {
    return {
      kind: "provider_submitted_transport_ack",
      providerMessageId,
    };
  }
  if (lc === "delivered_success") {
    return {
      kind: "provider_terminal_success_without_transport_correlation",
      notificationTypeHint: row.type,
    };
  }
  if (lc === "dead_letter") {
    const code = typeof slice.lastErrorCode === "string" ? slice.lastErrorCode.trim() || null : null;
    return { kind: "dead_letter_attempt_cap", lastErrorCode: code };
  }

  const code = typeof slice.lastErrorCode === "string" ? slice.lastErrorCode.trim() || null : null;
  const errPrev = typeof slice.lastError === "string" ? slice.lastError.trim().slice(0, 140) || null : null;
  return { kind: "provider_terminal_failed", lastErrorCode: code, lastErrorPreview: errPrev };
}
