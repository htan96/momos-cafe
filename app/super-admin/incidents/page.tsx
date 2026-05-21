import Link from "next/link";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import OperationalMetadataJumpLinks from "@/components/governance/OperationalMetadataJumpLinks";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import { prisma } from "@/lib/prisma";
import { OPERATIONAL_INCIDENT_ACTIVE_STATUSES } from "@/lib/operations/incidentTypes";

export const dynamic = "force-dynamic";

function incidentSeverityPillVariant(sev: string): StatusPillVariant {
  switch (sev) {
    case "info":
      return "neutral";
    case "warning":
      return "warning";
    case "high":
      return "degraded";
    case "critical":
      return "critical";
    default:
      return "neutral";
  }
}

function incidentBorderClass(sev: string): string {
  switch (sev) {
    case "critical":
      return "border-l-4 border-l-red-dark";
    case "high":
      return "border-l-4 border-l-amber-700";
    case "warning":
      return "border-l-4 border-l-amber-400";
    default:
      return "border-l-4 border-l-charcoal/15";
  }
}

export default async function SuperAdminIncidentsPage() {
  const [activeIncidents, resolvedIncidents] = await Promise.all([
    prisma.operationalIncident.findMany({
      where: { status: { in: [...OPERATIONAL_INCIDENT_ACTIVE_STATUSES] } },
      orderBy: { lastDetectedAt: "desc" },
    }),
    prisma.operationalIncident.findMany({
      where: { status: "resolved" },
      orderBy: { lastDetectedAt: "desc" },
      take: 24,
    }),
  ]);

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Command center"
        title="Incidents"
        subtitle="Operational incidents persisted in Postgres. When nothing is firing, this view stays deliberately quiet — no synthetic drill scenarios."
        actions={
          <Link
            href="/super-admin/live-activity"
            className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
          >
            Live activity
          </Link>
        }
      />

      <OperationalCard title="Active incidents" meta={`${activeIncidents.length} live`}>
        {activeIncidents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-cream-dark/80 bg-cream-mid/15 px-5 py-8 text-center">
            <p className="font-display text-[16px] text-teal-dark">No incidents detected</p>
            <p className="mt-2 text-[13px] text-charcoal/58 leading-relaxed max-w-lg mx-auto">
              The incident ledger is connected — there are simply no rows in an acknowledging state right now.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-cream-dark/40">
            {activeIncidents.map((row) => (
              <li
                key={row.id}
                className={`py-4 first:pt-0 pl-3 ${incidentBorderClass(row.severity)} flex flex-col gap-2`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill variant={incidentSeverityPillVariant(row.severity)}>{row.severity}</StatusPill>
                  <StatusPill variant="neutral">{row.status}</StatusPill>
                  <span className="text-[11px] font-mono text-charcoal/55 break-all">{row.type}</span>
                </div>
                <p className="text-[13px] font-semibold text-charcoal leading-snug">{row.title}</p>
                {row.description ? <p className="text-[13px] text-charcoal/70 leading-relaxed">{row.description}</p> : null}
                {row.affectedSystems.length > 0 ? (
                  <p className="text-[12px] text-charcoal/50">Affected · {row.affectedSystems.join(", ")}</p>
                ) : null}
                <OperationalMetadataJumpLinks metadata={row.metadata} />
              </li>
            ))}
          </ul>
        )}
      </OperationalCard>

      <OperationalCard title="Recently resolved" meta={resolvedIncidents.length ? `${resolvedIncidents.length} rows` : "History"}>
        {resolvedIncidents.length === 0 ? (
          <p className="text-[13px] text-charcoal/60 leading-relaxed">No resolved incidents recorded yet.</p>
        ) : (
          <ul className="divide-y divide-cream-dark/40">
            {resolvedIncidents.map((row) => (
              <li key={row.id} className="py-3 first:pt-0 flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill variant={incidentSeverityPillVariant(row.severity)}>{row.severity}</StatusPill>
                  <span className="text-[11px] font-mono text-charcoal/45">{row.type}</span>
                </div>
                <p className="text-[13px] text-charcoal/80">{row.title}</p>
                {row.resolvedAt ? (
                  <time className="text-[11px] text-charcoal/40" dateTime={row.resolvedAt.toISOString()}>
                    Resolved {row.resolvedAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </time>
                ) : null}
                <OperationalMetadataJumpLinks metadata={row.metadata} />
              </li>
            ))}
          </ul>
        )}
      </OperationalCard>
    </div>
  );
}
