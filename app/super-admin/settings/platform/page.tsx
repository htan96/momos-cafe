import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import { PLATFORM_FEATURE_DEFINITIONS, PLATFORM_FEATURE_KEYS } from "@/lib/platform/governanceFeatures";
import { ensurePlatformFeatures, loadPlatformFeatureStateUncached } from "@/lib/platform/platformFeatureState";
import PlatformGovernanceToggles, {
  type GovernanceFeatureBootstrap,
} from "./PlatformGovernanceToggles";

const modes = [
  { id: "maint", title: "Read-only storefront", description: "Blocks checkout while keeping catering intake visible." },
  { id: "degrade", title: "Degraded delights", description: "Hides tertiary modules; core menu + carts stay live." },
] as const;

function VisualToggle({ checked, labelledBy }: { checked: boolean; labelledBy: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled="true"
      disabled
      className={`relative inline-flex h-7 w-[46px] shrink-0 cursor-not-allowed rounded-full border transition-colors ${checked ? "border-teal/35 bg-teal/[0.12]" : "border-cream-dark bg-cream-mid/50"}`}
      aria-labelledby={labelledBy}
    >
      <span
        className={`pointer-events-none inline-block h-[22px] w-[22px] translate-y-[2px] rounded-full shadow-sm bg-white transition ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}`}
      />
    </button>
  );
}

async function bootstrapGovernanceFeatures(): Promise<GovernanceFeatureBootstrap[]> {
  await ensurePlatformFeatures();
  const state = await loadPlatformFeatureStateUncached();
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
    };
  });
}

export default async function SuperAdminSettingsPlatformPage() {
  const initialGovernanceFeatures = await bootstrapGovernanceFeatures();

  return (
    <div className="space-y-10">
      <GovPageHeader
        eyebrow="Settings · Platform"
        title="Operational modes"
        subtitle="Governance toggles below read/write `PlatformFeatureToggle` in Postgres and match the super-admin overview. Placeholder mode switches remain visual only."
      />

      <OperationalCard title="Operational modes" meta="Visual placeholders">
        <div className="space-y-4">
          {modes.map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-4 rounded-xl border border-cream-dark/60 bg-cream-mid/20 px-4 py-3">
              <div>
                <p id={`mode-${m.id}`} className="font-display text-[16px] text-teal-dark">
                  {m.title}
                </p>
                <p className="mt-1 text-[13px] text-charcoal/65">{m.description}</p>
              </div>
              <VisualToggle checked={false} labelledBy={`mode-${m.id}`} />
            </div>
          ))}
        </div>
      </OperationalCard>

      <OperationalCard
        title="Governance-controlled platform surfaces"
        meta="Backed by Postgres · cached reads · super_admin only APIs"
      >
        <PlatformGovernanceToggles initial={initialGovernanceFeatures} />
      </OperationalCard>

      <section className="rounded-2xl border border-red/25 bg-red/[0.04] px-5 py-5 md:px-6 md:py-6">
        <header className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-dark">Dangerous zone</p>
          <h2 className="mt-1 font-display text-xl tracking-tight text-teal-dark">Tenant-level resets</h2>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-charcoal/68">
            Irreversible data actions — dual approval, scripted backups, pause ingress. Buttons omitted until workflow design locks.
          </p>
        </header>
        <div className="flex flex-wrap gap-2 opacity-55">
          <button type="button" disabled className="rounded-xl border border-red/40 px-4 py-2 text-[13px] font-semibold text-red-dark cursor-not-allowed" aria-disabled="true">
            Purge storefront cache mirror
          </button>
          <button type="button" disabled className="rounded-xl border border-red/40 px-4 py-2 text-[13px] font-semibold text-red-dark cursor-not-allowed" aria-disabled="true">
            Freeze digital gift issuance
          </button>
        </div>
      </section>
    </div>
  );
}
