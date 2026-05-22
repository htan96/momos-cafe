import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";

export default function AdminSettingsOperationsPage() {
  return (
    <div className="space-y-8">
      <OpsPageHeader title="Operations defaults" subtitle="Timer and batch thresholds are not persisted via this route — orchestration knobs live in code and infrastructure today." />

      <OpsPanel title="Pack & label policy" eyebrow="Not modeled in admin tables">
        <p className="text-[13px] text-charcoal/70 leading-relaxed max-w-[56ch]">
          Soft SLAs and batch orchestration percentages are deliberately omitted until they are authored as configuration rows (or surfaced from live telemetry aggregates).
        </p>
      </OpsPanel>

      <OpsPanel title="Prep time templates" eyebrow="Kitchen + retail">
        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
              Catering tray buffer
            </span>
            <input
              type="number"
              disabled
              className="rounded-lg border border-cream-dark bg-white/82 px-3 py-2.5 text-charcoal/60 cursor-not-allowed"
              placeholder="—"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Retail staging</span>
            <input
              type="number"
              disabled
              className="rounded-lg border border-cream-dark bg-white/82 px-3 py-2.5 text-charcoal/60 cursor-not-allowed"
              placeholder="—"
            />
          </label>
        </div>
      </OpsPanel>

      <OpsPanel title="Escalation timers" eyebrow="Disabled">
        <div className="space-y-6 max-w-xl">
          <label className="grid gap-2">
            <span className="text-[12px] text-charcoal/70 flex justify-between">
              <span>Support soft cap</span>
              <span className="font-mono text-[11px] text-charcoal/45">Not persisted</span>
            </span>
            <input type="range" min={60} max={240} disabled className="w-full accent-teal-dark opacity-55 cursor-not-allowed" />
          </label>
          <label className="grid gap-2">
            <span className="text-[12px] text-charcoal/70 flex justify-between">
              <span>Label retry escalation</span>
              <span className="font-mono text-[11px] text-charcoal/45">Not persisted</span>
            </span>
            <input type="range" min={2} max={6} disabled className="w-full accent-teal-dark opacity-55 cursor-not-allowed" />
          </label>
        </div>
      </OpsPanel>
    </div>
  );
}
