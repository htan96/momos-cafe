import Link from "next/link";
import ManualShipmentForm from "@/components/operations/ManualShipmentForm";
import OperationalQueueCard from "@/components/operations/OperationalQueueCard";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import ShipmentExceptionRow from "@/components/operations/ShipmentExceptionRow";
import StateToneChip from "@/components/operations/StateToneChip";
import WorkflowTimeline from "@/components/operations/WorkflowTimeline";
import { loadAdminShippingContext } from "@/lib/admin/adminConsoleLoaders";
import { opsLoadShippingQueue } from "@/lib/ops/queries";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  const [ship, queue] = await Promise.all([loadAdminShippingContext(), opsLoadShippingQueue()]);
  const lastSync = ship.settings?.lastFullSyncAt
    ? new Date(ship.settings.lastFullSyncAt).toLocaleString()
    : "No recorded sync";

  const groupOptions = queue.map((g) => ({
    id: g.id,
    label: `${g.order.id.slice(0, 8)}… · ${g.status} · ${g.shipments.length} shipment rows`,
  }));

  return (
    <div className="space-y-10">
      <OpsPageHeader
        title="Shipping & labels"
        subtitle="Retail parcels, exception tiles, timelines, carrier purchase endpoint (`POST /api/ops/shipping/purchase-label`), and manual `Shipment` rows."
      />

      <OpsPanel
        title="Parcel queue · manual carrier rows"
        eyebrow="Operational"
        description="Same Prisma loaders as consolidated console — jump into order detail from any card for label purchase tooling."
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            <h3 className="text-[13px] font-semibold text-charcoal">Retail groups in motion</h3>
            {queue.length === 0 ?
              <p className="text-[13px] text-charcoal/58 border border-dashed border-charcoal/[0.12] rounded-xl p-10 text-center bg-cream/40">
                Nothing queued yet — storefront retail ship orders hydrate this list after checkout attaches shipping lines.
              </p>
            : <div className="space-y-2">
                {queue.map((g) => (
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
                ))}
              </div>
            }
          </div>

          <div>
            <ManualShipmentForm groupOptions={groupOptions} theme="admin" />
          </div>
        </div>
      </OpsPanel>

      <div className="grid gap-4 md:grid-cols-3">
        <OpsPanel title="Catalog mirror" eyebrow="Square storefront category">
          <div className="flex justify-end mb-3">
            <OpsStatusPill variant={ship.settings?.storeCategorySquareId ? "delivered" : "muted"}>Config</OpsStatusPill>
          </div>
          <p className="text-[13px] text-charcoal/68 leading-relaxed">
            Last full sync · <span className="font-semibold text-charcoal">{lastSync}</span>
          </p>
        </OpsPanel>

        <OpsPanel title="Retail fulfillment" eyebrow="Open workloads">
          <p className="text-[28px] font-display text-charcoal">{ship.openRetailShipGroups}</p>
          <p className="text-[13px] text-charcoal/58 mt-2">Non-terminal retail fulfillment groups touching active orders.</p>
          <p className="text-[13px] text-charcoal mt-6">
            Pending labels · <span className="font-semibold text-charcoal">{ship.pendingLabelCount}</span>
          </p>
          <Link
            href="/admin/fulfillment?tab=shipping"
            className="inline-flex mt-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-dark hover:underline underline-offset-4"
          >
            Fulfillment · shipping tab →
          </Link>
        </OpsPanel>

        <OpsPanel title="Exception depth" eyebrow={`${ship.exceptionRows.length} preview rows`}>
          <p className="text-[13px] text-charcoal/72 leading-relaxed">
            Ships in <span className="font-mono text-[12px]">exception</span> or{" "}
            <span className="font-mono text-[12px]">return_initiated</span> statuses appear below.
          </p>
          <div className="mt-4 flex justify-end">
            <OpsStatusPill variant={ship.timeline.length ? "in_progress" : "muted"}>Activity</OpsStatusPill>
          </div>
        </OpsPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkflowTimeline
          eyebrow="Operational events"
          title="Shipment-related activity"
          steps={
            ship.timeline.length > 0
              ? ship.timeline
              : [
                  {
                    id: "shipping-empty",
                    label: "No shipment events captured",
                    meta: "Types include webhook failures, carrier tracking deltas, label attempts.",
                    at: "—",
                    variant: "muted",
                  },
                ]
          }
        />
        <OpsPanel title="Routing context" eyebrow="Honest scopes">
          <p className="text-[13px] text-charcoal/68 leading-relaxed">
            Service selection and rate shopping happen when guests check out — this screen focuses on Postgres-backed operational
            states and audited actions.
          </p>
          <ul className="mt-6 space-y-3 text-[12px] text-charcoal/60 list-disc list-inside">
            <li>Use order detail (`/admin/orders/[uuid]`) to purchase carrier labels.</li>
            <li>Governance recovery continues to reuse `POST /api/ops/shipping/purchase-label` with your Cognito session.</li>
          </ul>
        </OpsPanel>
      </div>

      <OpsPanel title="Retry / exceptions" eyebrow="Shipments · Prisma-backed">
        <div className="space-y-3">
          {ship.exceptionRows.length === 0 ?
            <p className="text-[13px] text-charcoal/58">None in exception or return-initiated right now.</p>
          : ship.exceptionRows.map((e) => <ShipmentExceptionRow key={e.id} {...e} />)}
        </div>
      </OpsPanel>
    </div>
  );
}
