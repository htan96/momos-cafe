import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";

export default function AdminSettingsBusinessPage() {
  return (
    <div className="space-y-8">
      <OpsPageHeader title="Business settings" subtitle="Location, taxation, and printed copy knobs are still local to configuration — forms below are scaffolding without persistence." />

      <OpsPanel title="Identity & storefront" eyebrow="Not persisted via Prisma admin models">
        <div className="grid gap-4 max-w-xl">
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Brand display name</span>
            <input
              disabled
              className="rounded-lg border border-cream-dark bg-white/85 px-3 py-2.5 text-[14px] text-charcoal/60 cursor-not-allowed"
              placeholder="—"
            />
          </label>
          <label className="flex items-center gap-3 text-[13px] text-charcoal/65">
            <input type="checkbox" disabled className="h-5 w-5 accent-teal-dark shrink-0 cursor-not-allowed" />
            Show storefront hours on packing slips · not modeled
          </label>
        </div>
      </OpsPanel>

      <OpsPanel title="Fulfillment anchors" eyebrow="Not persisted via Prisma admin models">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Default dock</span>
            <select
              disabled
              className="rounded-lg border border-cream-dark bg-cream/50 px-3 py-2 text-[13px] text-charcoal/50 cursor-not-allowed"
              defaultValue=""
            >
              <option value="">—</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Tax region</span>
            <input
              disabled
              placeholder="California · Vallejo locality"
              className="rounded-lg border border-cream-dark bg-white/85 px-3 py-2.5 text-[14px] text-charcoal/50 cursor-not-allowed"
            />
          </label>
        </div>
      </OpsPanel>
    </div>
  );
}
