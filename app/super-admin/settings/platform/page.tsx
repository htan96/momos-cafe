import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";

const flags = [
  { id: "ff-catering-portal", label: "Catering beta surfaces", hint: "Franchises only · staged rollout", on: false },
  { id: "ff-rewards-sunset", label: "Legacy rewards migration prompt", hint: "Copy changes only until API lands", on: true },
  { id: "ff-queue-priority", label: "Fulfillment SLA bias", hint: "Geography-weighted sequencing", on: false },
] as const;

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

export default function SuperAdminSettingsPlatformPage() {
  return (
    <div className="space-y-10">
      <GovPageHeader
        eyebrow="Settings · Platform"
        title="Operational modes"
        subtitle="Glass switches are visual scaffolding — disabling prevents accidental optimism in demos."
      />

      <OperationalCard title="Operational modes" meta="Visual placeholders">
        <div className="space-y-4">
          {modes.map((m) => (
            <div key={m.id} className="flex gap-4 items-start justify-between rounded-xl border border-cream-dark/60 bg-cream-mid/20 px-4 py-3">
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

      <OperationalCard title="Feature flags" footer={<span className="text-[11px] text-charcoal/45">Source of truth remains env + registry — toggles illustrative only.</span>}>
        <ul className="space-y-4">
          {flags.map((f) => (
            <li key={f.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-b border-cream-dark/40 last:border-0">
              <div>
                <p id={f.id} className="text-[14px] font-semibold text-charcoal">
                  {f.label}
                </p>
                <p className="text-[12px] text-charcoal/55 mt-0.5">{f.hint}</p>
              </div>
              <VisualToggle checked={f.on} labelledBy={f.id} />
            </li>
          ))}
        </ul>
      </OperationalCard>

      <section className="rounded-2xl border border-red/25 bg-red/[0.04] px-5 py-5 md:px-6 md:py-6">
        <header className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-dark">Dangerous zone</p>
          <h2 className="font-display text-xl text-teal-dark mt-1 tracking-tight">Tenant-level resets</h2>
          <p className="text-[13px] text-charcoal/68 mt-2 max-w-xl">
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
