import type { AuditTimelineRow } from "@/components/governance/AuditTimeline";
import type { GovernanceAuditType } from "@/lib/governance/governanceAudit";
import { PLATFORM_FEATURE_DEFINITIONS, type PlatformFeatureKey } from "@/lib/platform/governanceFeatures";
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

function describePlatformFeatureChanges(meta: unknown): string {
  if (!isRecord(meta) || !Array.isArray(meta.changes)) return "platform features";
  const parts = meta.changes
    .map((c) => {
      if (!isRecord(c)) return null;
      const key = typeof c.key === "string" ? c.key : "";
      const enabled = c.enabled === true;
      if (!key) return null;
      return `${featureTitle(key)} (${enabled ? "on" : "off"})`;
    })
    .filter(Boolean) as string[];
  return parts.length ? parts.join(" · ") : "platform features";
}

export function governanceEventToTimelineRow(event: {
  id: string;
  type: string;
  actorEmail: string;
  targetEmail: string | null;
  meta: unknown;
  createdAt: Date;
}): AuditTimelineRow {
  const actor = event.actorEmail || "Unknown actor";
  const when = formatRelativeTimeShort(event.createdAt);
  const t = event.type as GovernanceAuditType | string;

  if (t === "impersonation_start") {
    const scope = isRecord(event.meta) && typeof event.meta.scope === "string" ? event.meta.scope : "unknown scope";
    const target = event.targetEmail ? `${event.targetEmail} · scope ${scope}` : `scope ${scope}`;
    return {
      id: event.id,
      actor,
      verb: "started impersonation as",
      target,
      relativeTime: when,
      severity: "warning",
      severityLabel: "Impersonation",
    };
  }

  if (t === "impersonation_end") {
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

  if (t === "perspective_change") {
    const perspective = isRecord(event.meta) && typeof event.meta.perspective === "string" ? event.meta.perspective : "unknown";
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

  if (t === "platform_feature_patch") {
    return {
      id: event.id,
      actor,
      verb: "updated",
      target: describePlatformFeatureChanges(event.meta),
      relativeTime: when,
      severity: "warning",
      severityLabel: "Features",
    };
  }

  return {
    id: event.id,
    actor,
    verb: "recorded",
    target: event.type,
    relativeTime: when,
    severity: "neutral",
    severityLabel: "Event",
  };
}

export async function loadRecentGovernanceAuditRows(limit: number): Promise<AuditTimelineRow[]> {
  const rows = await prisma.governanceAuditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      actorEmail: true,
      targetEmail: true,
      meta: true,
      createdAt: true,
    },
  });
  return rows.map(governanceEventToTimelineRow);
}

export async function countGovernanceEventsToday(args: {
  type: GovernanceAuditType | string;
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
      type: args.type,
      createdAt: { gte: start },
    },
  });
}
