import Link from "next/link";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill from "@/components/governance/StatusPill";

const STUB_STREAMS = [
  { id: "orders", name: "Order pipeline", detail: "Ingest → validate → kitchen ticket", tone: "ok" as const },
  { id: "web", name: "Storefront edge", detail: "Next.js routes + CDN (no synthetic probes)", tone: "neutral" as const },
  { id: "auth", name: "Cognito sessions", detail: "Customer / admin / super-admin pools", tone: "ok" as const },
  { id: "mail", name: "Transactional email", detail: "Workflow hooks — depth not wired in dev", tone: "neutral" as const },
];

export default function SuperAdminLiveOperationsPage() {
  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Platform · Operations"
        title="Live Operations"
        subtitle="Command-style snapshot for platform stewards. Telemetry here is descriptive until real queues and metrics are plumbed through — use it for orientation, not paging."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Order flow", value: "Nominal", sub: "No backlog simulator", variant: "ok" as const },
          { label: "Feature flags", value: "Cached ~45s", sub: "Postgres source", variant: "ok" as const },
          { label: "Impersonation", value: "Scoped", sub: "Super-admin only", variant: "ok" as const },
          { label: "Synthetic checks", value: "Not armed", sub: "Add probes externally", variant: "neutral" as const },
        ].map((tile) => (
          <div
            key={tile.label}
            className="rounded-2xl border border-cream-dark/55 bg-white/[0.93] px-4 py-4 shadow-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal/45">{tile.label}</p>
            <p className="mt-2 text-lg font-semibold text-charcoal tracking-tight">{tile.value}</p>
            <p className="mt-1 text-[12px] text-charcoal/55 leading-snug">{tile.sub}</p>
            <div className="mt-3">
              <StatusPill variant={tile.variant}>{tile.variant === "ok" ? "Stable" : "Stub"}</StatusPill>
            </div>
          </div>
        ))}
      </div>

      <OperationalCard title="Stream health (stub)" meta="Replace with live feeds">
        <ul className="divide-y divide-cream-dark/40">
          {STUB_STREAMS.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-charcoal">{row.name}</p>
                <p className="text-[12px] text-charcoal/55 mt-1 leading-relaxed">{row.detail}</p>
              </div>
              <StatusPill variant={row.tone === "ok" ? "ok" : "neutral"}>
                {row.tone === "ok" ? "Greenfield" : "Placeholder"}
              </StatusPill>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] text-charcoal/50 leading-relaxed border border-dashed border-cream-dark rounded-xl px-4 py-3 bg-cream-mid/15">
          When workers and queues land, this panel should show depth, p95 handoff, and last error — until then,
          keep runbooks and dashboards in your external ops toolchain.
        </p>
      </OperationalCard>

      <OperationalCard
        title="Related controls"
        meta="Deep links"
        footer={
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-semibold text-teal-dark">
            <Link href="/super-admin/settings/health" className="underline-offset-2 hover:underline">
              Health monitoring
            </Link>
            <Link href="/super-admin/audit" className="underline-offset-2 hover:underline">
              Audit logs
            </Link>
            <Link href="/admin/settings/maintenance" className="underline-offset-2 hover:underline">
              Maintenance (admin)
            </Link>
          </div>
        }
      >
        <p className="text-[13px] text-charcoal/65 leading-relaxed">
          Governance toggles and commerce gates stay on the overview and platform settings surfaces — this route is for
          operators watching flow, not editing feature rows.
        </p>
      </OperationalCard>
    </div>
  );
}
