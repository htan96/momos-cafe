import AuditTimeline from "@/components/governance/AuditTimeline";
import GovPageHeader from "@/components/governance/GovPageHeader";
import IntegrationTile from "@/components/governance/IntegrationTile";
import OperationalCard from "@/components/governance/OperationalCard";
import QueueHealthRow from "@/components/governance/QueueHealthRow";
import SecurityHighlight from "@/components/governance/SecurityHighlight";
import StatusPill from "@/components/governance/StatusPill";
import {
  mockActiveAlerts,
  mockAuditTimelineFull,
  mockIntegrations,
  mockQueueHealthRows,
  mockRecentAdminActions,
  mockSecurityHighlights,
  mockSystemStatusChips,
} from "@/lib/governance/mockSuperAdmin";

export default function SuperAdminHomePage() {
  const recentAudit = mockAuditTimelineFull.slice(0, 5);

  return (
    <div className="space-y-10">
      <GovPageHeader
        eyebrow="Operations"
        title="Control center"
        subtitle="Operational posture across integrations, queues, and privileged activity—mocked telemetry for shell review."
      />

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10 items-start">
        <div className="lg:col-span-7 space-y-6">
          <OperationalCard title="System status" meta="Synthetic summary">
            <p className="text-[13px] text-charcoal/65 mb-4 leading-relaxed">
              Services reflect placeholder health. When wired, degraded paths surface here without alarmist KPI tiles.
            </p>
            <div className="flex flex-wrap gap-2">
              {mockSystemStatusChips.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-2 rounded-lg border border-cream-dark/60 bg-cream-mid/25 px-3 py-1.5"
                >
                  <span className="text-[12px] font-medium text-charcoal/85">{s.label}</span>
                  <StatusPill variant={s.variant}>{s.pillLabel}</StatusPill>
                </span>
              ))}
            </div>
          </OperationalCard>

          <OperationalCard title="Integration strip" meta="Read-only overview">
            <div className="flex flex-wrap gap-3">{mockIntegrations.map((i) => (
              <IntegrationTile key={`${i.name}-${i.envLabel}`} {...i} />
            ))}</div>
          </OperationalCard>

          <OperationalCard title="Queue health" footer={<p className="text-[11px] text-charcoal/45">Depth and age placeholders — hook to observability stacks next.</p>}>
            <div>{mockQueueHealthRows.map((q) => (
              <QueueHealthRow key={q.name} {...q} />
            ))}</div>
          </OperationalCard>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <OperationalCard title="Active alerts">
            <ul className="space-y-4">
              {mockActiveAlerts.map((a) => (
                <li key={a.id} className="rounded-xl border border-cream-dark/55 bg-cream-mid/20 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-[16px] text-teal-dark leading-tight">{a.title}</p>
                      <p className="mt-1.5 text-[13px] text-charcoal/65 leading-snug">{a.detail}</p>
                    </div>
                    <StatusPill variant={a.variant}>{a.badge}</StatusPill>
                  </div>
                </li>
              ))}
            </ul>
          </OperationalCard>

          <OperationalCard title="Recent audit" meta={`${recentAudit.length} events`}>
            <AuditTimeline rows={recentAudit} />
          </OperationalCard>

          <OperationalCard title="Recent admin actions">
            <ul className="space-y-3" role="list">
              {mockRecentAdminActions.map((r) => (
                <li key={r.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 py-2 border-b border-cream-dark/40 last:border-0">
                  <div>
                    <p className="text-[13px] text-charcoal">
                      <span className="font-semibold">{r.actor}</span>
                      <span className="text-charcoal/60"> · {r.action}</span>
                    </p>
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-charcoal/45 shrink-0">{r.relativeTime}</p>
                </li>
              ))}
            </ul>
          </OperationalCard>

          <div className="space-y-3">
            {mockSecurityHighlights.map((s) => (
              <SecurityHighlight key={s.title} title={s.title}>
                {s.body}
              </SecurityHighlight>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
