import OpsMetricQuiet from "@/components/operations/OpsMetricQuiet";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import type { loadAdminFulfillmentWorkload } from "@/lib/admin/adminConsoleLoaders";

type WorkloadMetrics = Awaited<ReturnType<typeof loadAdminFulfillmentWorkload>>["metrics"];

/** Developer-facing fulfillment diagnostics — gated to delegated super-admin viewers on `/admin/fulfillment`. */
export default function FulfillmentSuperAdminTechnicalPanel(props: { metrics: WorkloadMetrics }) {
  const { metrics } = props;

  return (
    <div className="space-y-10">
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
    </div>
  );
}
