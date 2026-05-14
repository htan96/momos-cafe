import Link from "next/link";
import FulfillmentBatchRow from "@/components/operations/FulfillmentBatchRow";
import OpsMetricQuiet from "@/components/operations/OpsMetricQuiet";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import { adminFulfillmentBatches, adminFulfillmentRows } from "@/lib/operations/mockAdminOps";

const pickingStages = [
  { label: "Zone pick", hint: "Tote scans · SKU confidence", pct: "72%", variant: "in_progress" as const },
  { label: "Consolidate", hint: "Hot + garnish merge", pct: "48%", variant: "in_progress" as const },
  { label: "QA optional", hint: "High-value parcels", pct: "12%", variant: "queued" as const },
];

export default function AdminFulfillmentPage() {
  return (
    <div className="space-y-10">
      <OpsPageHeader
        title="Fulfillment floor"
        subtitle="Pack station choreography — mocks mirror how queues breathe through picking, staging, and label batons."
        actions={
          <Link
            href="/admin/shipping"
            className="rounded-lg border border-cream-dark bg-white px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-charcoal hover:bg-cream/80 transition-colors"
          >
            Labels
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <OpsMetricQuiet label="Cold chain depth" value="6" hint="Pickup overlap window" />
        <OpsMetricQuiet label="Tray staging" value="4" hint="Catering garnish lane" />
        <OpsMetricQuiet label="Retail batch" value="B-004" hint="Queued label purchase mock" />
      </div>

      <OpsPanel title="Packing queue" eyebrow="Table" description="Slot assignment + station ownership (static mock rows).">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-cream-dark/70 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
                <th className="py-2 pr-3">Slot</th>
                <th className="py-2 pr-3">Order</th>
                <th className="py-2 pr-3">Items</th>
                <th className="py-2 pr-3">ETA</th>
                <th className="py-2 pr-3">Station</th>
                <th className="py-2">State</th>
              </tr>
            </thead>
            <tbody>
              {adminFulfillmentRows.map((r) => (
                <tr key={r.id} className="border-b border-cream-dark/40">
                  <td className="py-3 font-mono text-charcoal">{r.slot}</td>
                  <td className="py-3 font-semibold">{r.orderRef}</td>
                  <td className="py-3 text-charcoal/70">{r.items}</td>
                  <td className="py-3 text-charcoal/60">{r.eta}</td>
                  <td className="py-3 text-charcoal/60">{r.station}</td>
                  <td className="py-3">
                    <OpsStatusPill variant={r.variant} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OpsPanel>

      <div className="grid gap-5 lg:grid-cols-3">
        {pickingStages.map((s) => (
          <OpsPanel key={s.label} title={s.label} description={s.hint}>
            <div className="flex items-center justify-between gap-3 mt-2">
              <OpsStatusPill variant={s.variant} />
              <span className="font-display text-2xl text-charcoal">{s.pct}</span>
            </div>
          </OpsPanel>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OpsPanel title="Batch staging" eyebrow="Consolidation">
          <div className="space-y-3">
            {adminFulfillmentBatches.map((b) => (
              <FulfillmentBatchRow key={b.id} {...b} />
            ))}
          </div>
        </OpsPanel>

        <OpsPanel title="Packing slip preview" eyebrow="Print mocks">
          <div className="rounded-xl border border-dashed border-charcoal/[0.12] bg-cream/55 px-4 py-8 text-center space-y-2">
            <p className="text-[13px] font-semibold text-charcoal">MOMO’S CAFÉ · pack sheet</p>
            <p className="text-[11px] text-charcoal/50 uppercase tracking-[0.16em]">Order MC-84930 · tote A-14</p>
            <p className="text-[12px] text-charcoal/65 mt-4">
              Slip layout placeholder — barcode, carrier token, allergens, handwritten notes ribbon.
            </p>
          </div>
        </OpsPanel>
      </div>
    </div>
  );
}
