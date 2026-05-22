import Link from "next/link";

import ShippingOperationalCards from "@/components/admin/shipping/ShippingOperationalCards";
import ShippingSuperAdminTechnicalPanel from "@/components/admin/shipping/ShippingSuperAdminTechnicalPanel";
import FulfillmentBatchRow from "@/components/operations/FulfillmentBatchRow";
import ManualShipmentForm from "@/components/operations/ManualShipmentForm";
import OperationalQueueCard from "@/components/operations/OperationalQueueCard";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import ShipmentExceptionRow from "@/components/operations/ShipmentExceptionRow";
import StateToneChip from "@/components/operations/StateToneChip";
import { loadAdminRetailLabelsPendingBatches, loadAdminShippingContext } from "@/lib/admin/adminConsoleLoaders";
import { assertAdminPlatformLayout } from "@/lib/auth/cognito/assertRoleInLayout";
import { opsLoadShippingQueue } from "@/lib/ops/queries";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  const [{ showSuperAdminOperationalLens }, ship, queue, labelBatches] = await Promise.all([
    assertAdminPlatformLayout(),
    loadAdminShippingContext(),
    opsLoadShippingQueue(),
    loadAdminRetailLabelsPendingBatches(12),
  ]);

  const lastCatalogSyncPlain = ship.settings?.lastFullSyncAt
    ? new Date(ship.settings.lastFullSyncAt).toLocaleString()
    : "None recorded yet";

  const groupOptions = queue.map((g) => ({
    id: g.id,
    label: `${g.order.id.slice(0, 8)}… · ${g.status} · ${g.shipments.length} shipment rows`,
  }));

  const parcelReady = queue.filter((g) => g.status === "pending");
  const inProcess = queue.filter((g) => g.status === "merch_processing");

  function queueCardForGroup(g: (typeof queue)[number]) {
    return (
      <div key={g.id} id={g.id}>
        <OperationalQueueCard
          href={`/admin/orders/${g.order.id}`}
          title={`Ship · order ${g.order.id.slice(0, 8)}…`}
          subtitle={`${g.status} · ${g.shipments.length ? `latest ${g.shipments[0]?.carrier ?? "carrier"} · ${g.shipments[0]?.trackingNumber ?? ""}` : "no shipment rows yet"}`}
          meta={g.order.status}
          chips={
            <>
              <StateToneChip label="RETAIL" tone="teal" />
              <StateToneChip label={g.status} tone="neutral" />
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <OpsPageHeader
        title="Shipping & labels"
        subtitle="See parcels that need packing, shipments missing tracking, and carrier issues—then open each order for label tools."
      />

      {/* Admin-Focused Shipping — operational lens (parity with FulfillmentOperationalCards pattern). */}
      <ShippingOperationalCards
        ordersWithIssuesCount={ship.shipmentExceptionCount}
        parcelQueueReadyCount={parcelReady.length}
        ordersInProcessCount={inProcess.length}
        pendingLabelCount={ship.pendingLabelCount}
      />

      <OpsPanel
        title="Shipment queue"
        eyebrow="Parcels"
        description="Retail orders that shipped from the storefront—open one to finish packing or attach carrier tracking."
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-10">
            <div id="shipping-parcel-queue" className="scroll-mt-28 space-y-3">
              <h3 className="text-[13px] font-semibold text-charcoal">Ready for packing</h3>
              {parcelReady.length === 0 ?
                <p className="text-[13px] text-charcoal/58 border border-dashed border-charcoal/[0.12] rounded-xl p-8 text-center bg-cream/40">
                  Nothing in the ready-for-packing queue right now—checkout attaches retail ship lines before rows appear here.
                </p>
              : <div className="space-y-2">{parcelReady.map(queueCardForGroup)}</div>}
            </div>

            <div id="shipping-in-process-queue" className="scroll-mt-28 space-y-3">
              <h3 className="text-[13px] font-semibold text-charcoal">Being packaged</h3>
              {inProcess.length === 0 ?
                <p className="text-[13px] text-charcoal/58 border border-dashed border-charcoal/[0.12] rounded-xl p-8 text-center bg-cream/40">
                  No parcels marked in progress—the team stages those states from order detail tooling.
                </p>
              : <div className="space-y-2">{inProcess.map(queueCardForGroup)}</div>}
            </div>

            <div id="shipping-shipped-tail" className="scroll-mt-28 space-y-3">
              <h3 className="text-[13px] font-semibold text-charcoal">Recently shipped rows still on file</h3>
              <p className="text-[12px] text-charcoal/52">
                Older shipped rows sometimes linger here briefly—prioritize the two sections above for active follow-up.
              </p>
              {queue.every((g) => g.status !== "shipped") ?
                <p className="text-[13px] text-charcoal/55">None in this pull.</p>
              : <div className="space-y-2">
                  {queue.filter((g) => g.status === "shipped").map(queueCardForGroup)}
                </div>
              }
            </div>
          </div>

          <div className="shrink-0">
            <ManualShipmentForm groupOptions={groupOptions} theme="admin" />
          </div>
        </div>
      </OpsPanel>

      <div id="shipping-labels-pending" className="scroll-mt-28">
        <OpsPanel title="Labels pending detail" eyebrow="Retail shipments">
          <div className="space-y-3">
            {labelBatches.length === 0 ?
              <p className="text-[13px] text-charcoal/55">No shipments are missing tracking today.</p>
            : labelBatches.map((b) => <FulfillmentBatchRow key={b.id} {...b} />)}
          </div>
          <Link
            href="/admin/fulfillment?tab=shipping"
            className="inline-flex mt-6 text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-dark hover:underline underline-offset-4"
          >
            Fulfillment · shipping tab →
          </Link>
        </OpsPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div id="shipping-slip-preview" className="scroll-mt-28">
          <OpsPanel title="Sample packing slip" eyebrow="Reference">
            <div className="rounded-xl border border-dashed border-charcoal/[0.12] bg-cream/55 px-4 py-8 text-center space-y-2">
              <p className="text-[13px] font-semibold text-charcoal">Momos Café · outbound label preview</p>
              <p className="text-[12px] text-charcoal/65 mt-4">
                Live printing pulls packing lines from the storefront order—use this tile only when you want a glance at layout spacing.
              </p>
            </div>
          </OpsPanel>
        </div>

        <div id="shipping-product-reference" className="scroll-mt-28">
          <OpsPanel title="Product reference" eyebrow="Synced catalog timing">
            <div className="flex justify-end mb-3">
              <OpsStatusPill variant={ship.settings?.storeCategorySquareId ? "delivered" : "muted"}>
                Connected
              </OpsStatusPill>
            </div>
            <p className="text-[13px] text-charcoal/72 leading-relaxed">
              Tracks when storefront categories finished their last coordinated sync—not a live catalog editor.
            </p>
            <p className="text-[13px] text-charcoal mt-6">
              Last snapshot · <span className="font-semibold text-charcoal">{lastCatalogSyncPlain}</span>
            </p>
          </OpsPanel>
        </div>
      </div>

      <OpsPanel title="Carrier or return alerts" eyebrow="Needs eyes on it">
        <div id="shipping-issues-queue" className="scroll-mt-28 space-y-3">
          {ship.exceptionRows.length === 0 ?
            <p className="text-[13px] text-charcoal/58">No carrier exceptions or customer returns need review right now.</p>
          : ship.exceptionRows.map((e) => <ShipmentExceptionRow key={e.id} {...e} />)}
        </div>
      </OpsPanel>

      {showSuperAdminOperationalLens ?
        <div className="space-y-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
            Super-admin · technical detail
          </p>
          <ShippingSuperAdminTechnicalPanel shipContext={ship} hydratedShippingQueueCount={queue.length} />
        </div>
      : null}
    </div>
  );
}
