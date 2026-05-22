import AuditTimeline from "@/components/governance/AuditTimeline";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import EmptyGovState from "@/components/governance/EmptyGovState";
import { loadRecentGovernanceAuditRows } from "@/lib/governance/governanceAuditDisplay";


export default async function SuperAdminSecurityAuditLogsPage({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const notice = typeof sp.notice === "string" ? sp.notice.trim() : "";

  const rows = await loadRecentGovernanceAuditRows(100);

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Security · Evidence"
        title="Audit logs"
        subtitle="Append-only GovernanceAuditEvent stream — newest 100 reads. Structured filters ship with the backlog; nothing here impersonates segmentation."
      />

      {notice === "security-events-deferred" ?
        <OperationalCard title="About security KPI tiles" meta="Transparency">
          <p className="text-[13px] text-charcoal/75 leading-relaxed">
            Dedicated threat-feed panels stay deferred — we redirect the old sidebar entry here so auditors see candid copy instead of empty chrome. Incident response stays with provider consoles plus this audited stream.
          </p>
        </OperationalCard>
      : null}

      <OperationalCard
        title="Governance timeline"
        meta="Latest 100 · GovernanceAuditEvent"
        footer={
          <p className="text-[11px] text-charcoal/48 leading-relaxed">
            Maintenance swings, impersonation envelopes, governance control edits, and platform feature toggles land here whenever the
            API paths emit rows — no scripted demo entries.
          </p>
        }
      >
        {rows.length ? (
          <AuditTimeline rows={rows} />
        ) : (
          <div className="rounded-xl border border-dashed border-cream-dark bg-cream-mid/18 px-5 py-8 text-center">
            <p className="font-display text-[17px] text-teal-dark">No audit rows yet</p>
            <p className="mt-2 text-[13px] text-charcoal/58 max-w-xl mx-auto leading-relaxed">
              Once operators change platform-visible state via governed APIs, chronological evidence materializes automatically.
            </p>
          </div>
        )}
      </OperationalCard>

      <EmptyGovState
        title="Export & filters backlog"
        description="CSV egress and multidimensional filtering require scoped jobs tied to SOC review windows. Until they ship rely on constrained SQL snapshots approved by governance."
      />
    </div>
  );
}
