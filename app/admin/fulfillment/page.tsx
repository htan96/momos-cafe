import Link from "next/link";
import FulfillmentBatchRow from "@/components/operations/FulfillmentBatchRow";
import OpsMetricQuiet from "@/components/operations/OpsMetricQuiet";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import { loadAdminFulfillmentWorkload } from "@/lib/admin/adminConsoleLoaders";

export default async function AdminFulfillmentPage() {
  const { tableRows, batches, metrics } = await loadAdminFulfillmentWorkload();

  return (
    <div className="space-y-10">
      <OpsPageHeader
        title="Fulfillment floor"
        subtitle="Fulfillment groups, label-pending shipments, and late/stuck heuristics mirrored from `/lib/ops/queries.ts`."
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
        <OpsMetricQuiet
          label="Late / stale groups"
          value={String(metrics.coldChainOrLateStuckAttention)}
          hint="36h stuck heuristic from ops dashboards"
        />
        <OpsMetricQuiet
          label="Kitchen-heavy attention"
          value={String(metrics.kitchenAttentionEstimate)}
          hint="Subset of late/stuck routed through kitchen workloads"
        />
        <OpsMetricQuiet label="Retail ship attention" value={String(metrics.retailShipAttentionEstimate)} hint="Retail ship-program slice" />
      </div>

      <OpsPanel
        title="Packing queue"
        eyebrow="Table"
        description="Recent open fulfillment groups (paid · non-terminal)."
      >
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
              {tableRows.length === 0 ? (
                <tr>
                  <td className="py-4 text-charcoal/55" colSpan={6}>
                    No snapshots in range.
                  </td>
                </tr>
              ) : (
                tableRows.map((r) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </OpsPanel>

      <div className="grid gap-5 lg:grid-cols-3">
        <OpsPanel title="Late / stuck heuristic" description="Fulfillment rows breaching coarse aging rules.">
          <div className="flex items-center justify-between gap-3 mt-2">
            <OpsStatusPill variant={metrics.coldChainOrLateStuckAttention ? "blocked" : "delivered"}>Signal</OpsStatusPill>
            <span className="font-display text-2xl text-charcoal">{metrics.coldChainOrLateStuckAttention}</span>
          </div>
        </OpsPanel>

        <OpsPanel title="Kitchen attention" description="Late/stuck groups classified as kitchen / pickup-heavy.">
          <div className="flex items-center justify-between gap-3 mt-2">
            <OpsStatusPill variant={metrics.kitchenAttentionEstimate ? "in_progress" : "muted"}>Signal</OpsStatusPill>
            <span className="font-display text-2xl text-charcoal">{metrics.kitchenAttentionEstimate}</span>
          </div>
        </OpsPanel>

        <OpsPanel title="Retail ship attention" description="Retail ship-program rows still open.">
          <div className="flex items-center justify-between gap-3 mt-2">
            <OpsStatusPill variant={metrics.retailShipAttentionEstimate ? "in_progress" : "muted"}>Signal</OpsStatusPill>
            <span className="font-display text-2xl text-charcoal">{metrics.retailShipAttentionEstimate}</span>
          </div>
        </OpsPanel>
      </div>

      <OpsPanel eyebrow="Disclosure" title="No fabricated stage percentages">
        <p className="text-[13px] text-charcoal/65 leading-relaxed">
          Zone pick/consolidate/QA completeness is not mirrored from scanners yet — dashboards stay empty until aisle telemetry lands.
        </p>
      </OpsPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <OpsPanel title="Label staging" eyebrow="Retail shipments awaiting tracking">
          <div className="space-y-3">
            {batches.length === 0 ? (
              <p className="text-[13px] text-charcoal/55">No shipments are missing tracking today.</p>
            ) : (
              batches.slice(0, 8).map((b) => <FulfillmentBatchRow key={b.id} {...b} />)
            )}
          </div>
        </OpsPanel>

        <OpsPanel title="Packing slip preview" eyebrow="Template">
          <div className="rounded-xl border border-dashed border-charcoal/[0.12] bg-cream/55 px-4 py-8 text-center space-y-2">
            <p className="text-[13px] font-semibold text-charcoal">Momos Café · fulfillment label</p>
            <p className="text-[12px] text-charcoal/65 mt-4">
              Slip artwork is storefront-driven — rendered at print time elsewhere.
            </p>
          </div>
        </OpsPanel>
      </div>
    </div>
  );
}
