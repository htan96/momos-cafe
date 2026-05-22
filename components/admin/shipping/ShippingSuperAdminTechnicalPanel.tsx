import OpsMetricQuiet from "@/components/operations/OpsMetricQuiet";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import WorkflowTimeline, { type WorkflowTimelineStep } from "@/components/operations/WorkflowTimeline";
import type { loadAdminShippingContext } from "@/lib/admin/adminConsoleLoaders";

export type ShippingSuperAdminPanelProps = {
  shipContext: Awaited<ReturnType<typeof loadAdminShippingContext>>;
  /** Rows returned by `opsLoadShippingQueue()` (hydrated FulfillmentGroups for retail shipping). */
  hydratedShippingQueueCount: number;
};

/**
 * Developer-facing shipping diagnostics (`POST /api/ops/shipping/purchase-label`, Prisma loaders, legacy jargon).
 * Visible only under `showSuperAdminOperationalLens`.
 */
export default function ShippingSuperAdminTechnicalPanel(props: ShippingSuperAdminPanelProps) {
  const { shipContext, hydratedShippingQueueCount } = props;

  const lastSync = shipContext.settings?.lastFullSyncAt
    ? new Date(shipContext.settings.lastFullSyncAt).toLocaleString()
    : "No recorded sync";

  const timeline: WorkflowTimelineStep[] =
    shipContext.timeline.length > 0 ?
      shipContext.timeline
    : [
        {
          id: "shipping-empty",
          label: "No shipment events captured",
          meta: "Types include webhook failures, carrier tracking deltas, label attempts.",
          at: "—",
          variant: "muted",
        },
      ];

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-3">
        <OpsMetricQuiet
          label="Parcel queue · manual carrier rows"
          value={`${hydratedShippingQueueCount} hydrated groups`}
          hint="Legacy board label mapping — `opsLoadShippingQueue()` (Prisma FulfillmentGroup · RETAIL pipeline subset)."
        />
        <OpsMetricQuiet
          label="Retail groups in motion (count)"
          value={String(shipContext.openRetailShipGroups)}
          hint="Prisma count · non-terminal RETAIL FulfillmentGroups on paid / partially fulfilled / pending_payment orders."
        />
        <OpsMetricQuiet
          label="Exception depth · preview rows"
          value={`${shipContext.exceptionRows.length} shown / ${shipContext.shipmentExceptionCount} DB`}
          hint="Shipment statuses `exception` and `return_initiated` (`loadAdminShipmentExceptionRows` previews at most eight)."
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <OpsPanel title="Retail fulfillment aggregates" eyebrow="Prisma Postgres">
          <p className="text-[28px] font-display text-charcoal">{shipContext.openRetailShipGroups}</p>
          <p className="text-[13px] text-charcoal/58 mt-2">
            Non-terminal retail fulfillment groups on paid / partially fulfilled / pending_payment orders (`openRetailShipGroups`).
          </p>
          <p className="text-[13px] text-charcoal mt-6">
            Pending labels (retail shipments without tracking) ·{" "}
            <span className="font-semibold text-charcoal">{shipContext.pendingLabelCount}</span>
          </p>
        </OpsPanel>

        <OpsPanel title="Catalog mirror" eyebrow="Square storefront category · catalogSyncState singleton">
          <div className="flex justify-end mb-3">
            <OpsStatusPill variant={shipContext.settings?.storeCategorySquareId ? "delivered" : "muted"}>Config</OpsStatusPill>
          </div>
          <p className="text-[13px] text-charcoal/68 leading-relaxed">
            Last full sync · <span className="font-semibold text-charcoal">{lastSync}</span>
          </p>
        </OpsPanel>

        <OpsPanel title="Shipment purchase route" eyebrow="Audited mutation">
          <p className="text-[13px] text-charcoal/68 leading-relaxed">
            Order detail invokes <span className="font-mono text-[12px] text-charcoal">POST /api/ops/shipping/purchase-label</span>{" "}
            with Cognito-authenticated warehouse sessions.
          </p>
        </OpsPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkflowTimeline eyebrow="Operational events" title="Shipment-related activity · raw audit types" steps={timeline} />
        <OpsPanel title="Routing context" eyebrow="Postgres-backed states">
          <p className="text-[13px] text-charcoal/68 leading-relaxed">
            Service selection and rate shopping happen at checkout — this console focuses on Prisma hydration and audited fulfillment
            actions.
          </p>
          <ul className="mt-6 space-y-3 text-[12px] text-charcoal/60 list-disc list-inside">
            <li>Use `/admin/orders/[uuid]` to purchase carrier labels through the delegated purchase endpoint.</li>
            <li>Manual inserts continue through `POST /api/ops/shipping/manual` (see ManualShipmentForm).</li>
          </ul>
        </OpsPanel>
      </div>
    </div>
  );
}
