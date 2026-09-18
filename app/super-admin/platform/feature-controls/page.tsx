import Link from "next/link";
import GovPageHeader from "@/components/governance/GovPageHeader";
import MaintenanceConflictBanner from "@/components/governance/MaintenanceConflictBanner";
import OperationalCard from "@/components/governance/OperationalCard";
import { loadLatestGovernanceAuditReasons } from "@/lib/governance/governanceAuditReasons";
import { loadGovernanceSnapshot } from "@/lib/governance/governanceSnapshot";
import { PLATFORM_FEATURE_DEFINITIONS, PLATFORM_FEATURE_KEYS } from "@/lib/platform/governanceFeatures";
import { ensurePlatformFeatures, loadPlatformFeatureStateUncached } from "@/lib/platform/platformFeatureState";
import AppSettingGatesPanel from "./AppSettingGatesPanel";
import PlatformGovernanceToggles, {
  type GovernanceFeatureBootstrap,
} from "./PlatformGovernanceToggles";
import GovernanceControlsPanel, { type GovernanceControlBootstrap } from "./GovernanceControlsPanel";
import {
  GOVERNANCE_CONTROL_DEFINITIONS,
  GOVERNANCE_CONTROL_KEYS,
  type GovernanceControlCategory,
  type GovernanceControlKey,
} from "@/lib/governance/controlKeys";
import { loadGovernanceControlRowsUncached } from "@/lib/governance/governanceControls";


/** Avoid Postgres access during `next build` — page bootstraps via Prisma only at request time. */
export const dynamic = "force-dynamic";

async function bootstrapGovernanceFeatures(): Promise<GovernanceFeatureBootstrap[]> {
  await ensurePlatformFeatures();
  const [state, auditReasons] = await Promise.all([
    loadPlatformFeatureStateUncached(),
    loadLatestGovernanceAuditReasons([...PLATFORM_FEATURE_KEYS]),
  ]);
  return PLATFORM_FEATURE_KEYS.map((key) => {
    const def = PLATFORM_FEATURE_DEFINITIONS[key];
    const row = state[key];
    return {
      key,
      title: def.title,
      description: def.description,
      rolloutNotes: def.rolloutNotes,
      defaultEnabled: def.defaultEnabled,
      allowOverrideRoles: def.allowOverrideRoles,
      enabled: row.enabled,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
      lastAuditReason: auditReasons[key]?.reason ?? null,
    };
  });
}

async function bootstrapGovernanceControls(): Promise<GovernanceControlBootstrap[]> {
  const [rows, auditReasons] = await Promise.all([
    loadGovernanceControlRowsUncached(),
    loadLatestGovernanceAuditReasons([...GOVERNANCE_CONTROL_KEYS]),
  ]);
  return rows.map((row) => {
    const key = row.key as GovernanceControlKey;
    const def = GOVERNANCE_CONTROL_DEFINITIONS[key];
    return {
      key,
      category: row.category as GovernanceControlCategory,
      title: def.title,
      description: row.description ?? def.description,
      enabled: row.enabled,
      updatedAt: row.updatedAt.toISOString(),
      lastModifiedBy: row.lastModifiedBy,
      lastAuditReason: auditReasons[key]?.reason ?? null,
    };
  });
}

export default async function SuperAdminPlatformFeatureControlsPage({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const notice = typeof sp.notice === "string" ? sp.notice.trim() : "";

  const [initialGovernanceFeatures, initialGovernanceControls, snapshot] = await Promise.all([
    bootstrapGovernanceFeatures(),
    bootstrapGovernanceControls(),
    loadGovernanceSnapshot(),
  ]);

  return (
    <div className="space-y-10">
      <GovPageHeader
        eyebrow="Governance"
        title="Feature controls"
        subtitle="Status-first controls with explicit actions — kill switches, platform features, and maintenance gates. Enforcement is immediate at the API boundary."
        actions={
          <Link
            href="/super-admin/platform/operational-status"
            className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
          >
            Operational status
          </Link>
        }
      />

      <MaintenanceConflictBanner conflicts={snapshot.maintenanceConflicts} />

      {notice === "platform-notifications-deferred" ?
        <div className="rounded-xl border border-cream-dark/60 bg-white/90 px-4 py-3 text-[13px] text-charcoal/75 shadow-sm">
          Outbound broadcast drafting still lives elsewhere — notifications were redirected here from a retired sidebar stub. Governance controls below remain authoritative for kill-switch posture.
        </div>
      : null}

      <OperationalCard
        title="Operational governance"
        meta="PlatformGovernanceControl · enforced 403s · AppSetting write-through"
      >
        <GovernanceControlsPanel initial={initialGovernanceControls} />
      </OperationalCard>

      <div id="operational-presets" className="-scroll-mt-28">
        <OperationalCard title="Operational mode presets" meta="Roadmap · not persisted">
          <p className="text-[13px] text-charcoal/70 leading-relaxed">
            Saved degrade / bundles are{" "}
            <span className="font-semibold text-charcoal">not configured</span> — rely on granular controls above rather than scripted preset rows until Postgres-backed configuration ships.
          </p>
        </OperationalCard>
      </div>

      <OperationalCard title="Maintenance gates (AppSetting)" meta="ShopEnabled · MenuEnabled · positive semantics">
        <AppSettingGatesPanel />
      </OperationalCard>

      <OperationalCard
        title="Governance-controlled platform surfaces"
        meta="Backed by Postgres · cached reads · super_admin only APIs"
      >
        <PlatformGovernanceToggles initial={initialGovernanceFeatures} />
      </OperationalCard>

      <section className="rounded-2xl border border-red/22 bg-red/[0.03] px-5 py-5 md:px-6 md:py-6">
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-dark">Tenant safety</p>
          <h2 className="mt-1 font-display text-lg tracking-tight text-teal-dark">Destructive resets</h2>
          <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-charcoal/65">
            Irreversible platform actions stay outside this shell — routed through scripted runbooks when they exist. Nothing here will simulate a purge or freeze.
          </p>
        </header>
      </section>
    </div>
  );
}
