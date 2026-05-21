"use client";

import Link from "next/link";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import type { LiveActivitySnapshotIncident } from "@/lib/liveActivity/types";

function incidentSeverityPillVariant(sev: string): StatusPillVariant {
  switch (sev) {
    case "critical":
      return "critical";
    case "high":
      return "degraded";
    case "warning":
      return "warning";
    default:
      return "neutral";
  }
}

type Props = {
  incidents: LiveActivitySnapshotIncident[];
};

export default function LiveActivityIncidentBanner({ incidents }: Props) {
  if (incidents.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-900/25 bg-amber-50/80 px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-charcoal">
          {incidents.length} active incident{incidents.length === 1 ? "" : "s"}
        </p>
        <Link
          href="/super-admin/incidents"
          className="text-[12px] font-semibold text-teal-dark hover:underline underline-offset-2"
        >
          Open incidents
        </Link>
      </div>
      <ul className="space-y-2">
        {incidents.slice(0, 3).map((inc) => (
          <li key={inc.id} className="flex flex-wrap items-center gap-2 text-[12px] text-charcoal/80">
            <StatusPill variant={incidentSeverityPillVariant(inc.severity)}>{inc.severity}</StatusPill>
            <StatusPill variant="neutral">{inc.status}</StatusPill>
            <span>{inc.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
