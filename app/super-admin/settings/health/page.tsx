import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill from "@/components/governance/StatusPill";
import {
  getPublicClientIntegrationEnvRows,
  getImpersonationEnvRows,
} from "@/lib/governance/integrationEnvSnapshot";

export default function SuperAdminSettingsHealthPage() {
  const publicRows = getPublicClientIntegrationEnvRows();
  const impersonationRows = getImpersonationEnvRows();
  const nodeEnv = process.env.NODE_ENV ?? "(unknown)";

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Settings · Health"
        title="Runtime visibility"
        subtitle="No synthetic mesh probes ship here yet — this page stays descriptive until real monitoring lands."
      />

      <OperationalCard title="Service status" meta="Honest default">
        <p className="text-[13px] text-charcoal/70 leading-relaxed">
          Live uptime, queue depth, and latency tiles require an observability integration (metrics + health checks). Until that
          ships, avoid interpreting any green/red chart in screenshots — there is no background ping in this route.
        </p>
        <p className="mt-4 text-[12px] text-charcoal/50 leading-relaxed border border-dashed border-cream-dark rounded-xl px-4 py-3 bg-cream-mid/15">
          Status unavailable until monitoring ships — keep on-call playbooks in your external dashboard, not this UI shell.
        </p>
      </OperationalCard>

      <OperationalCard title="Runtime shell" meta="Non-secret signals">
        <div className="flex flex-wrap gap-2 items-center text-[13px] text-charcoal/75">
          <span className="font-medium">NODE_ENV</span>
          <code className="rounded-md border border-cream-dark/70 bg-cream-mid/25 px-2 py-0.5 text-[12px]">{nodeEnv}</code>
        </div>
        <p className="mt-4 text-[12px] text-charcoal/50 leading-relaxed">
          Database connectivity, worker pools, and CDN health are not probed from this page.
        </p>
      </OperationalCard>

      <OperationalCard title="Public build knobs (presence only)" meta="NEXT_PUBLIC_* · never shows values">
        <ul className="space-y-3">
          {publicRows.map((row) => (
            <li key={row.envKey} className="flex flex-wrap items-start justify-between gap-3 border-b border-cream-dark/35 pb-3 last:border-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-charcoal">{row.label}</p>
                <p className="text-[11px] text-charcoal/45 mt-1 font-mono truncate" title={row.envKey}>
                  {row.envKey}
                </p>
                {row.note ? <p className="text-[11px] text-charcoal/50 mt-1">{row.note}</p> : null}
              </div>
              <StatusPill variant={row.configured ? "ok" : "neutral"}>{row.configured ? "Set" : "Unset"}</StatusPill>
            </li>
          ))}
        </ul>
      </OperationalCard>

      <OperationalCard title="Impersonation gate" meta="Super-admin tooling">
        <ul className="space-y-3">
          {impersonationRows.map((row) => (
            <li key={row.envKey} className="flex flex-wrap items-start justify-between gap-3 border-b border-cream-dark/35 pb-3 last:border-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-charcoal">{row.label}</p>
                <p className="text-[11px] text-charcoal/45 mt-1 font-mono">{row.envKey}</p>
                {row.note ? <p className="text-[11px] text-charcoal/50 mt-1">{row.note}</p> : null}
              </div>
              <StatusPill variant={row.configured ? "ok" : "neutral"}>{row.configured ? "Ready" : "Missing"}</StatusPill>
            </li>
          ))}
        </ul>
      </OperationalCard>
    </div>
  );
}
