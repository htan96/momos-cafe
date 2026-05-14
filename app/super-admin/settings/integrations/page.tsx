import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill from "@/components/governance/StatusPill";
import {
  getPublicClientIntegrationEnvRows,
  getShippoEnvRows,
  getImpersonationEnvRows,
} from "@/lib/governance/integrationEnvSnapshot";

function EnvBoolList({ rows }: { rows: ReturnType<typeof getShippoEnvRows> }) {
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.envKey} className="flex flex-wrap items-start justify-between gap-3 border-b border-cream-dark/35 pb-3 last:border-0 last:pb-0">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-charcoal">{row.label}</p>
            <p className="text-[11px] text-charcoal/45 mt-1 font-mono">{row.envKey}</p>
            {row.note ? <p className="text-[11px] text-charcoal/50 mt-1">{row.note}</p> : null}
          </div>
          <StatusPill variant={row.configured ? "ok" : "neutral"}>{row.configured ? "Present" : "Missing"}</StatusPill>
        </li>
      ))}
    </ul>
  );
}

export default function SuperAdminSettingsIntegrationsPage() {
  const shippo = getShippoEnvRows();
  const publicClient = getPublicClientIntegrationEnvRows();
  const impersonation = getImpersonationEnvRows();

  return (
    <div className="space-y-10">
      <GovPageHeader
        eyebrow="Settings · Integrations"
        title="Configuration visibility"
        subtitle="Environment presence checks only — no webhook percentiles, fabricated retries, or carrier uptime."
      />

      <OperationalCard title="Shippo" meta="Server credentials · not executed here">
        <EnvBoolList rows={shippo} />
        <p className="mt-4 text-[12px] text-charcoal/50 leading-relaxed">
          This page does not call Shippo. Shipping quotes at runtime use the same env vars; readiness belongs in external monitors.
        </p>
      </OperationalCard>

      <OperationalCard title="Client-exposed integrations" meta="NEXT_PUBLIC_* · Square / defaults">
        <EnvBoolList rows={publicClient} />
      </OperationalCard>

      <OperationalCard title="Super-admin impersonation" meta="Audited operations prerequisite">
        <EnvBoolList rows={impersonation} />
      </OperationalCard>

      <OperationalCard title="Outbound email & webhooks" meta="Not inferred">
        <p className="text-[13px] text-charcoal/70 leading-relaxed">
          SMTP relays, marketing ESPs, and per-tenant webhook endpoints are not modeled in this codebase snapshot. When connectors
          register their env contracts, list them here as honest presence rows — not fabricated 24-hour delivery counters.
        </p>
      </OperationalCard>
    </div>
  );
}
