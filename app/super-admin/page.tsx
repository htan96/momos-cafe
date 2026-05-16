import Link from "next/link";
import AuditTimeline from "@/components/governance/AuditTimeline";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill from "@/components/governance/StatusPill";
import {
  countGovernanceEventsToday,
  loadRecentGovernanceAuditRows,
} from "@/lib/governance/governanceAuditDisplay";
import { getMaintenanceFlags } from "@/lib/app-settings/settings";
import { PLATFORM_FEATURE_DEFINITIONS, PLATFORM_FEATURE_KEYS } from "@/lib/platform/governanceFeatures";
import { getPlatformFeatureState } from "@/lib/platform/platformFeatureState";

function attentionItems(args: {
  features: Awaited<ReturnType<typeof getPlatformFeatureState>>;
  shopEnabled: boolean;
  menuEnabled: boolean;
}): string[] {
  const bullets: string[] = [];
  if (!args.features.customer_platform.enabled) {
    bullets.push(
      "Customer account platform is off — signed-in `/account` experiences and external copy that promise the hub should stay quiet for non–super-admin users."
    );
  }
  if (!args.shopEnabled) {
    bullets.push("Shop catalog gate (AppSetting) is closed — retail `/shop` maintenance is active.");
  }
  if (!args.menuEnabled) {
    bullets.push("Menu gate (AppSetting) is closed — café `/menu` and `/order` flows are blocked.");
  }
  return bullets;
}

export default async function SuperAdminHomePage() {
  const [featureState, maintenance, auditRows, impersonationStartsToday] = await Promise.all([
    getPlatformFeatureState(),
    getMaintenanceFlags(),
    loadRecentGovernanceAuditRows(25),
    countGovernanceEventsToday({ type: "impersonation_start" }),
  ]);

  const attention = attentionItems({
    features: featureState,
    shopEnabled: maintenance.shopEnabled,
    menuEnabled: maintenance.menuEnabled,
  });
  const recentAudit = auditRows.slice(0, 5);

  return (
    <div className="space-y-10">
      <GovPageHeader
        eyebrow="Platform"
        title="Overview"
        subtitle="Governance home — Postgres-backed feature toggles, commerce gates, and the append-only audit stream. For real-time posture, pair with Live Operations once queues land."
      />

      <OperationalCard
        title="Governance-controlled surfaces"
        meta={
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link
              href="/super-admin/live-operations"
              className="text-[12px] font-semibold text-teal-dark underline-offset-2 hover:underline"
            >
              Live operations
            </Link>
            <Link href="/super-admin/settings/platform" className="text-[12px] font-semibold text-teal-dark underline-offset-2 hover:underline">
              Platform settings
            </Link>
          </div>
        }
      >
        <p className="text-[13px] text-charcoal/65 mb-4 leading-relaxed">
          Values mirror `PlatformFeatureToggle` rows (cached ~45s). Updates persist through the super-admin API and appear in the audit feed.
        </p>
        <div className="overflow-x-auto rounded-xl border border-cream-dark/55">
          <table className="min-w-full text-left text-[13px]">
            <thead className="bg-cream-mid/35 text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/50">
              <tr>
                <th className="px-4 py-3">Feature</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3 hidden sm:table-cell">Last change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/45">
              {PLATFORM_FEATURE_KEYS.map((key) => {
                const def = PLATFORM_FEATURE_DEFINITIONS[key];
                const row = featureState[key];
                const on = row.enabled;
                return (
                  <tr key={key} className="bg-white/[0.92]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-charcoal">{def.title}</p>
                      <p className="text-[12px] text-charcoal/55 mt-1 leading-snug">{def.description}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusPill variant={on ? "ok" : "neutral"}>{on ? "On" : "Off"}</StatusPill>
                    </td>
                    <td className="px-4 py-3 align-top text-charcoal/60 hidden sm:table-cell tabular-nums">
                      {row.updatedAt.getTime() > 0 ? row.updatedAt.toLocaleString() : "—"}
                      {row.updatedBy ? (
                        <span className="block text-[11px] text-charcoal/45 mt-1">by {row.updatedBy}</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </OperationalCard>

      <OperationalCard title="Commerce maintenance gates" meta="AppSetting · ShopEnabled / MenuEnabled">
        <ul className="space-y-3 text-[13px] text-charcoal/75 leading-relaxed">
          <li>
            <span className="font-semibold text-charcoal">Retail shop catalog — </span>
            {maintenance.shopEnabled ? (
              <span>Open for normal traffic.</span>
            ) : (
              <span className="text-red-dark">Closed — shop surfaces should show maintenance treatment.</span>
            )}
          </li>
          <li>
            <span className="font-semibold text-charcoal">Café menu & ordering — </span>
            {maintenance.menuEnabled ? (
              <span>Open for normal traffic.</span>
            ) : (
              <span className="text-red-dark">Closed — menu and order routes should stay blocked.</span>
            )}
          </li>
        </ul>
      </OperationalCard>

      {attention.length > 0 ? (
        <OperationalCard title="Requires attention" meta="Derived from live flags">
          <ul className="list-disc pl-5 space-y-3 text-[13px] text-charcoal/75 leading-relaxed">
            {attention.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </OperationalCard>
      ) : null}

      <OperationalCard
        title="Recent governance audit"
        meta={`${recentAudit.length} of ${auditRows.length} loaded · impersonation starts today: ${impersonationStartsToday}`}
        footer={
          <Link href="/super-admin/audit" className="text-[12px] font-semibold text-teal-dark underline-offset-2 hover:underline">
            View full audit stream
          </Link>
        }
      >
        {recentAudit.length ? (
          <AuditTimeline rows={recentAudit} />
        ) : (
          <p className="text-[13px] text-charcoal/60 leading-relaxed">
            No governance events recorded yet — impersonation, perspective changes, and platform patches will appear here automatically.
          </p>
        )}
      </OperationalCard>
    </div>
  );
}
