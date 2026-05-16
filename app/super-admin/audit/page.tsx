import AuditTimeline from "@/components/governance/AuditTimeline";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import EmptyGovState from "@/components/governance/EmptyGovState";
import { loadRecentGovernanceAuditRows } from "@/lib/governance/governanceAuditDisplay";

const filterChipLabels = ["Actor", "Verb", "Target", "Severity", "Last 24h"] as const;

const legendEntries: { variant: StatusPillVariant; label: string }[] = [
  { variant: "ok", label: "Routine / session cleared" },
  { variant: "neutral", label: "Informational perspective" },
  { variant: "warning", label: "Impersonation · feature edits" },
  { variant: "critical", label: "Reserved" },
  { variant: "degraded", label: "Reserved" },
  { variant: "down", label: "Reserved" },
];

export default async function SuperAdminAuditPage() {
  const rows = await loadRecentGovernanceAuditRows(100);

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Evidence"
        title="Audit stream"
        subtitle="Latest 100 rows from `GovernanceAuditEvent`, newest first. Filter chips are visual placeholders only in this pass."
        actions={
          <button
            type="button"
            disabled
            className="rounded-xl border border-teal-dark/40 bg-teal-dark text-cream px-4 py-2 text-[13px] font-semibold opacity-55 cursor-not-allowed"
            aria-disabled="true"
          >
            Export CSV
          </button>
        }
      />

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mr-2">Filters</span>
        {filterChipLabels.map((label) => (
          <button
            key={label}
            type="button"
            disabled
            className="rounded-full border border-cream-dark bg-cream-mid/35 px-3 py-1.5 text-[12px] font-medium text-charcoal/55 opacity-70 cursor-not-allowed"
            aria-disabled="true"
          >
            {label}
          </button>
        ))}
      </div>

      <OperationalCard title="Severity legend" meta="How rows are colored today">
        <div className="flex flex-wrap gap-2">
          {legendEntries.map((entry) => (
            <StatusPill key={`${entry.variant}-${entry.label}`} variant={entry.variant}>
              {entry.label}
            </StatusPill>
          ))}
        </div>
      </OperationalCard>

      <OperationalCard
        title="Governance timeline"
        footer={
          <p className="text-[11px] text-charcoal/45">
            Permanent governance actions (maintenance, platform controls, impersonation, sessions) append here — append-only, real operations
            only.
          </p>
        }
      >
        {rows.length ? (
          <AuditTimeline rows={rows} />
        ) : (
          <p className="text-[13px] text-charcoal/60 leading-relaxed">
            The audit table is empty. Rows appear when administrators perform actions that change platform or session state.
          </p>
        )}
      </OperationalCard>

      <EmptyGovState
        title="CSV export not wired"
        description="Export will honor scoped governance reviews once the backend job lands. Until then, use a read-only SQL slice if policy requires a snapshot."
      />
    </div>
  );
}
