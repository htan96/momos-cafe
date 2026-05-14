import AuditTimeline from "@/components/governance/AuditTimeline";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import EmptyGovState from "@/components/governance/EmptyGovState";
import { mockAuditTimelineFull } from "@/lib/governance/mockSuperAdmin";

const filterChipLabels = ["Actor", "Verb", "Target", "Severity", "Last 24h"] as const;

const legendEntries: { variant: StatusPillVariant; label: string }[] = [
  { variant: "ok", label: "Routine / policy" },
  { variant: "neutral", label: "Informational" },
  { variant: "warning", label: "Change / elevated" },
  { variant: "critical", label: "Export · break-glass" },
  { variant: "degraded", label: "Dependency strain" },
  { variant: "down", label: "Unavailable" },
];

export default function SuperAdminAuditPage() {
  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Evidence"
        title="Audit stream"
        subtitle="Synthetic timeline demonstrating density and hierarchy. Filters are visual only in this pass."
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
            className="rounded-full border border-cream-dark bg-cream-mid/35 px-3 py-1.5 text-[12px] font-medium text-charcoal/65 hover:bg-cream-mid/55 transition-colors cursor-default"
            aria-pressed={false}
          >
            {label}
          </button>
        ))}
      </div>

      <OperationalCard title="Severity legend" meta="Subdued cues">
        <div className="flex flex-wrap gap-2">
          {legendEntries.map((entry) => (
            <StatusPill key={`${entry.variant}-${entry.label}`} variant={entry.variant}>
              {entry.label}
            </StatusPill>
          ))}
        </div>
      </OperationalCard>

      <OperationalCard title="Governance timeline" footer={<p className="text-[11px] text-charcoal/45">End of synthetic slice — paging hooks later.</p>}>
        <AuditTimeline rows={mockAuditTimelineFull} />
      </OperationalCard>

      <EmptyGovState
        title="No export in this preview"
        description="When connectors land, CSV exports respect scope and watermarking. Chips above are placeholders for parity with ops tooling."
      />
    </div>
  );
}
