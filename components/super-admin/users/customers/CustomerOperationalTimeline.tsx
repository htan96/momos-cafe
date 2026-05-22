import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import type {
  CustomerOperationalTimelineItem,
  CustomerOperationalTimelineLane,
} from "@/lib/accountManagement/queryCustomerOperationalTimeline";
import type { OperationalActivitySeverity } from "@prisma/client";

function laneLabel(lane: CustomerOperationalTimelineLane): string {
  switch (lane) {
    case "auth":
      return "Auth";
    case "orders":
      return "Orders";
    case "payments":
      return "Payments";
    case "shipments":
      return "Shipments";
    case "impersonation":
      return "Impersonation";
    case "admin":
      return "Admin";
    case "incident":
      return "Incident";
    case "catalog":
      return "Catalog";
    case "presence":
      return "Presence";
    default:
      return "Other";
  }
}

function severityVariant(severity: OperationalActivitySeverity | "audit"): StatusPillVariant {
  if (severity === "audit") return "neutral";
  switch (severity) {
    case "info":
      return "neutral";
    case "warning":
      return "warning";
    case "error":
      return "degraded";
    case "critical":
      return "critical";
    default:
      return "neutral";
  }
}

export default function CustomerOperationalTimeline({ rows }: { rows: CustomerOperationalTimelineItem[] }) {
  if (!rows.length) {
    return (
      <p className="text-[13px] text-charcoal/60 leading-relaxed">
        No merged operational or governance timeline rows matched this diner yet. Coverage depends on how events were
        emitted (metadata actors, `entities.customerId`, and governance targets).
      </p>
    );
  }

  return (
    <ul className="divide-y divide-cream-dark/40">
      {rows.map((row) => (
        <li key={row.id} className="py-4 first:pt-0 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <time
                dateTime={row.at.toISOString()}
                className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45"
              >
                {row.at.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
              <StatusPill variant="neutral">{laneLabel(row.lane)}</StatusPill>
              <StatusPill variant={severityVariant(row.severity)}>{row.severity}</StatusPill>
              <span className="text-[11px] font-mono text-charcoal/50">{row.kind === "governance_audit" ? "governance_audit" : "operational_activity"}</span>
              {row.rawType ? (
                <span className="text-[11px] font-mono text-charcoal/55 break-all">{row.rawType}</span>
              ) : null}
            </div>
            <p className="text-[13px] text-charcoal leading-snug">{row.headline}</p>
            {row.detail ?
              <p className="text-[12px] text-charcoal/55 leading-relaxed whitespace-pre-wrap">{row.detail}</p>
            : null}
            {row.source ?
              <p className="text-[11px] font-mono text-charcoal/45 break-all">source:{row.source}</p>
            : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
