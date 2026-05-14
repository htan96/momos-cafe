import GovPageHeader from "@/components/governance/GovPageHeader";
import StatusPill from "@/components/governance/StatusPill";
import { mockServiceHealthCards } from "@/lib/governance/mockSuperAdmin";

function LatencySpark({ values }: { values: readonly number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-px h-9 mt-4" aria-hidden="true">
      {values.map((v, i) => {
        const h = Math.round((v / max) * 100);
        return (
          <div
            key={i}
            className="w-[5px] rounded-[1px] bg-gradient-to-t from-teal/[0.12] to-teal-dark/35"
            style={{ height: `${Math.max(h, 8)}%` }}
          />
        );
      })}
    </div>
  );
}

export default function SuperAdminSettingsHealthPage() {
  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Settings · Health"
        title="Service mesh snapshot"
        subtitle="Muted cards with synthetic latency sparklines — replaces loud uptime widgets."
      />

      <div className="grid gap-6 sm:grid-cols-2">
        {mockServiceHealthCards.map((svc) => (
          <article
            key={svc.id}
            className="rounded-2xl border border-cream-dark/70 bg-white/[0.94] px-5 py-5 md:px-6 shadow-[0_1px_0_rgba(45,107,107,0.05),0_8px_26px_-14px_rgba(46,42,37,0.14)] flex flex-col"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-teal-dark tracking-tight">{svc.name}</h2>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mt-1">{svc.region}</p>
              </div>
              <StatusPill variant={svc.variant}>{svc.statusLabel}</StatusPill>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-charcoal/60">
              <span>{svc.latencyLabel}</span>
            </div>
            <LatencySpark values={svc.spark} />
            <p className="mt-4 text-[12px] text-charcoal/50 leading-relaxed">CSS-only shimmer — aligns with hospitable understatement.</p>
          </article>
        ))}
      </div>
    </div>
  );
}
