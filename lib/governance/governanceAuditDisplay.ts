import type { AuditTimelineRow } from "@/components/governance/AuditTimeline";
import type { GovernanceAuditActionType } from "@/lib/governance/governanceAuditActionTypes";
import { PLATFORM_FEATURE_DEFINITIONS, type PlatformFeatureKey } from "@/lib/platform/governanceFeatures";
import { GOVERNANCE_CONTROL_DEFINITIONS, type GovernanceControlKey } from "@/lib/governance/controlKeys";
import { prisma } from "@/lib/prisma";

function formatRelativeTimeShort(input: Date, now = new Date()): string {
  const diffSec = Math.round((input.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 604800) return rtf.format(Math.round(diffSec / 86400), "day");
  return rtf.format(Math.round(diffSec / 604800), "week");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function featureTitle(key: string): string {
  const k = key as PlatformFeatureKey;
  return PLATFORM_FEATURE_DEFINITIONS[k]?.title ?? key;
}

function controlTitle(key: string): string {
  const k = key as GovernanceControlKey;
  return GOVERNANCE_CONTROL_DEFINITIONS[k]?.title ?? key;
}

function describeGovernanceControlChanges(meta: unknown): string {
  if (!isRecord(meta) || !Array.isArray(meta.changes)) return "governance controls";
  const parts = meta.changes
    .map((c) => {
      if (!isRecord(c)) return null;
      const key = typeof c.key === "string" ? c.key : "";
      const enabled = c.enabled === true;
      if (!key) return null;
      return `${controlTitle(key)} (${enabled ? "BLOCKED" : "ACTIVE"})`;
    })
    .filter(Boolean) as string[];
  return parts.length ? parts.join(" · ") : "governance controls";
}

function describePlatformFeatureChanges(meta: unknown): string {
  if (!isRecord(meta) || !Array.isArray(meta.changes)) return "platform features";
  const parts = meta.changes
    .map((c) => {
      if (!isRecord(c)) return null;
      const key = typeof c.key === "string" ? c.key : "";
      const enabled = c.enabled === true;
      if (!key) return null;
      return `${featureTitle(key)} (${enabled ? "ACTIVE" : "DISABLED"})`;
    })
    .filter(Boolean) as string[];
  return parts.length ? parts.join(" · ") : "platform features";
}

function describeMaintenanceKeys(meta: unknown): string {
  if (!isRecord(meta) || !Array.isArray(meta.keysChanged)) return "maintenance flags";
  const keys = meta.keysChanged.filter((k) => typeof k === "string") as string[];
  return keys.length ? keys.join(" · ") : "maintenance flags";
}

export function governanceEventToTimelineRow(event: {
  id: string;
  actionType: string;
  actorName: string;
  targetName: string | null;
  metadata: unknown;
  description: string | null;
  reason?: string | null;
  createdAt: Date;
}): AuditTimelineRow {
  const actor = event.actorName || "Unknown actor";
  const when = formatRelativeTimeShort(event.createdAt);
  const t = event.actionType as GovernanceAuditActionType | string;

  if (t === "IMPERSONATION_STARTED" || t === "impersonation_start") {
    const scope =
      isRecord(event.metadata) && typeof event.metadata.scope === "string" ? event.metadata.scope : "unknown scope";
    const target = event.targetName ? `${event.targetName} · scope ${scope}` : `scope ${scope}`;
    const reasonFrag =
      typeof event.reason === "string" && event.reason.trim().length ?
        event.reason.trim().slice(0, 160)
      : "";
    const targetCombined = reasonFrag ? `${target} · reason: ${reasonFrag}` : target;
    return {
      id: event.id,
      actor,
      verb: "started impersonation as",
      target: targetCombined,
      relativeTime: when,
      severity: "warning",
      severityLabel: "Impersonation",
    };
  }

  if (t === "IMPERSONATION_ENDED" || t === "impersonation_end") {
    return {
      id: event.id,
      actor,
      verb: "ended",
      target: "impersonation session",
      relativeTime: when,
      severity: "ok",
      severityLabel: "Session",
    };
  }

  if (t === "PERSPECTIVE_CHANGED" || t === "perspective_change") {
    const perspective =
      isRecord(event.metadata) && typeof event.metadata.perspective === "string"
        ? event.metadata.perspective
        : "unknown";
    return {
      id: event.id,
      actor,
      verb: "set operational perspective to",
      target: perspective,
      relativeTime: when,
      severity: "neutral",
      severityLabel: "Perspective",
    };
  }

  if (t === "PLATFORM_FEATURE_UPDATED" || t === "platform_feature_patch") {
    return {
      id: event.id,
      actor,
      verb: "updated",
      target: describePlatformFeatureChanges(event.metadata),
      relativeTime: when,
      severity: "warning",
      severityLabel: "Features",
    };
  }

  if (t === "GOVERNANCE_CONTROL_UPDATED" || t === "governance_control_patch") {
    if (isRecord(event.metadata) && typeof event.metadata.key === "string") {
      const en = event.metadata.enabled === true;
      const statusFromMeta =
        typeof event.metadata.operationalStatus === "string"
          ? event.metadata.operationalStatus
          : en
            ? "BLOCKED"
            : "ACTIVE";
      const reasonFrag =
        typeof event.reason === "string" && event.reason.trim().length
          ? ` · reason: ${event.reason.trim().slice(0, 120)}`
          : "";
      return {
        id: event.id,
        actor,
        verb: "set governance control to",
        target: `${controlTitle(event.metadata.key)} (${statusFromMeta})${reasonFrag}`,
        relativeTime: when,
        severity: "warning",
        severityLabel: "Control",
      };
    }
    if (isRecord(event.metadata) && Array.isArray(event.metadata.changes)) {
      return {
        id: event.id,
        actor,
        verb: "updated governance controls",
        target: describeGovernanceControlChanges({ changes: event.metadata.changes }),
        relativeTime: when,
        severity: "warning",
        severityLabel: "Control",
      };
    }
    return {
      id: event.id,
      actor,
      verb: "updated",
      target: "governance control",
      relativeTime: when,
      severity: "warning",
      severityLabel: "Control",
    };
  }

  if (t === "MAINTENANCE_UPDATED") {
    return {
      id: event.id,
      actor,
      verb: "updated maintenance gates",
      target: describeMaintenanceKeys(event.metadata),
      relativeTime: when,
      severity: "warning",
      severityLabel: "Maintenance",
    };
  }

  if (
    t === "USER_ROLE_CHANGED" ||
    t === "ADMIN_PROMOTED" ||
    t === "ADMIN_DEMOTED" ||
    t === "user.role_patch"
  ) {
    const meta = isRecord(event.metadata) ? event.metadata : {};
    const fromRole = typeof meta.fromRole === "string" ? meta.fromRole : "unknown";
    const toRole = typeof meta.toRole === "string" ? meta.toRole : "unknown";
    const who = typeof meta.cognitoUsername === "string" ? meta.cognitoUsername : event.targetName ?? "profile";
    return {
      id: event.id,
      actor,
      verb: t === "ADMIN_PROMOTED" ? "promoted" : t === "ADMIN_DEMOTED" ? "demoted" : "changed role for",
      target: `${who} (${fromRole} → ${toRole})`,
      relativeTime: when,
      severity: t === "ADMIN_DEMOTED" ? "warning" : "neutral",
      severityLabel: "Access",
    };
  }

  if (t === "CUSTOMER_COGNITO_SESSION_REVOKE_DEFERRED") {
    const r = typeof event.reason === "string" && event.reason.trim() ? event.reason.trim().slice(0, 280) : "—";
    return {
      id: event.id,
      actor,
      verb: "filed revoke intent (IAM/Cognito deferred)",
      target: `${event.targetName ?? "unknown diner"} · ${r}`,
      relativeTime: when,
      severity: "warning",
      severityLabel: "Access",
    };
  }

  if (t === "OPERATIONS_IDENTITY_ROLE_MEMBERSHIP_CHANGE") {
    const meta = isRecord(event.metadata) ? event.metadata : null;
    const action = typeof meta?.action === "string" ? meta.action : "change";
    const gn = typeof meta?.groupName === "string" ? meta.groupName : "group";
    const phase =
      typeof meta?.phase === "string" ?
        meta.phase.replace(/_/g, " ")
      : "";
    const tgt =
      isRecord(meta?.target) && typeof meta.target.sub === "string"
        ? meta.target.sub.slice(0, 10) + "…"
        : (event.targetName ?? "subject");
    return {
      id: event.id,
      actor,
      verb: `${action} pooled ${gn}${phase ? ` (${phase})` : ""}`,
      target: tgt,
      relativeTime: when,
      severity:
        typeof meta?.phase === "string" && (meta.phase === "cognitoMutationError" || meta.phase === "cognito_unconfigured")
          ? "warning"
          : "neutral",
      severityLabel: "Access",
    };
  }

  if (t === "OPERATIONAL_INCIDENT_UPDATED") {
    return {
      id: event.id,
      actor,
      verb: "updated operational incident",
      target:
        typeof event.metadata === "object" &&
        event.metadata &&
        typeof (event.metadata as { beforeStatus?: string }).beforeStatus === "string" ?
          `${(event.metadata as { beforeStatus: string }).beforeStatus} → ${
            (event.metadata as { afterStatus?: string }).afterStatus ?? "updated"
          }`
        : (event.description ?? "incident PATCH"),
      relativeTime: when,
      severity: "warning",
      severityLabel: "Operations",
    };
  }

  if (t === "SESSION_TERMINATED") {
    const reason =
      isRecord(event.metadata) && typeof event.metadata.terminationReason === "string"
        ? event.metadata.terminationReason
        : "session_end";
    return {
      id: event.id,
      actor,
      verb: "ended staff presence",
      target: reason.replace(/_/g, " "),
      relativeTime: when,
      severity: "ok",
      severityLabel: "Session",
    };
  }

  return {
    id: event.id,
    actor,
    verb: "recorded",
    target: event.description ?? event.actionType,
    relativeTime: when,
    severity: "neutral",
    severityLabel: "Event",
  };
}

/** Subset shown on `/super-admin/users/admins` “governance preview” rail (elevated-impact verbs only). */
export const ELEVATED_GOVERNANCE_PREVIEW_ACTION_TYPES: GovernanceAuditActionType[] = [
  "USER_ROLE_CHANGED",
  "ADMIN_PROMOTED",
  "ADMIN_DEMOTED",
  "IMPERSONATION_STARTED",
  "IMPERSONATION_ENDED",
  "OPERATIONAL_INCIDENT_UPDATED",
  "OPERATIONAL_FAILURE_TRIAGE_UPDATED",
  "MAINTENANCE_UPDATED",
  "PLATFORM_FEATURE_UPDATED",
  "OPERATIONS_SHIPPO_LABEL_RECOVERY_ATTEMPTED",
  "OPERATIONS_SHIPPO_LABEL_RECOVERY_SUCCEEDED",
  "OPERATIONS_CATALOG_SYNC_SUCCEEDED",
  "OPERATIONS_CATALOG_SYNC_FAILED",
  "OPERATIONS_SQUARE_PAYMENT_LOOKUP_RECONCILE",
  "CUSTOMER_COGNITO_SESSION_REVOKE_DEFERRED",
  "OPERATIONS_IDENTITY_ROLE_MEMBERSHIP_CHANGE",
];
export async function loadElevatedGovernanceAuditPreview(limit = 20): Promise<AuditTimelineRow[]> {
  const capped = Math.min(50, Math.max(5, limit));
  const rows = await prisma.governanceAuditEvent.findMany({
    where: { actionType: { in: ELEVATED_GOVERNANCE_PREVIEW_ACTION_TYPES } },
    orderBy: { createdAt: "desc" },
    take: capped,
    select: {
      id: true,
      actionType: true,
      actorName: true,
      targetName: true,
      metadata: true,
      description: true,
      reason: true,
      createdAt: true,
    },
  });
  return rows.map(governanceEventToTimelineRow);
}

export async function loadRecentGovernanceAuditRows(limit: number): Promise<AuditTimelineRow[]> {
  const rows = await prisma.governanceAuditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      actionType: true,
      actorName: true,
      targetName: true,
      metadata: true,
      description: true,
      reason: true,
      createdAt: true,
    },
  });
  return rows.map(governanceEventToTimelineRow);
}

export async function countGovernanceEventsToday(args: {
  actionType: GovernanceAuditActionType | string;
  startOfDayUtc?: Date;
}): Promise<number> {
  const start =
    args.startOfDayUtc ??
    (() => {
      const d = new Date();
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
    })();
  return prisma.governanceAuditEvent.count({
    where: {
      actionType: args.actionType,
      createdAt: { gte: start },
    },
  });
}
