import OpsMetricQuiet from "@/components/operations/OpsMetricQuiet";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";

export default function AdminSettingsOperationsPage() {
  return (
    <div className="space-y-8">
      <OpsPageHeader title="Operations defaults" subtitle="Fulfillment choreography + escalation scaffolding — mocks for timers and batching thresholds." />

      <div className="grid gap-4 sm:grid-cols-3">
        <OpsMetricQuiet label="Pack SLA (soft)" value="12m" hint="First tactile touch" />
        <OpsMetricQuiet label="Batch label gate" value="≥ 3 parcels" hint="Retail USPS combine" />
        <OpsMetricQuiet label="Carrier swap timer" value="45m" hint="Before guest comms" />
      </div>

      <OpsPanel title="Prep time templates" eyebrow="Kitchen + retail">
        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
              Catering tray buffer
            </span>
            <input
              type="number"
              disabled
              defaultValue={35}
              className="rounded-lg border border-cream-dark bg-white/82 px-3 py-2.5 text-charcoal/60 cursor-not-allowed"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Retail staging</span>
            <input
              type="number"
              disabled
              defaultValue={18}
              className="rounded-lg border border-cream-dark bg-white/82 px-3 py-2.5 text-charcoal/60 cursor-not-allowed"
            />
          </label>
        </div>
      </OpsPanel>

      <OpsPanel title="Escalation timers · mock sliders" eyebrow="Disabled">
        <div className="space-y-6 max-w-xl">
          <label className="grid gap-2">
            <span className="text-[12px] text-charcoal/70 flex justify-between">
              <span>Support soft cap</span>
              <span className="font-mono text-[11px] text-charcoal/45">120m · mock</span>
            </span>
            <input type="range" min={60} max={240} disabled className="w-full accent-teal-dark opacity-55 cursor-not-allowed" />
          </label>
          <label className="grid gap-2">
            <span className="text-[12px] text-charcoal/70 flex justify-between">
              <span>Label retry escalation</span>
              <span className="font-mono text-[11px] text-charcoal/45">3 attempts · mock</span>
            </span>
            <input type="range" min={2} max={6} disabled className="w-full accent-teal-dark opacity-55 cursor-not-allowed" />
          </label>
        </div>
      </OpsPanel>
    </div>
  );
}
