import OpsPageHeader from "@/components/ops/OpsPageHeader";
import OpsQueueCard from "@/components/ops/OpsQueueCard";
import StateChip from "@/components/ops/StateChip";
import ManualShipmentForm from "@/components/ops/ManualShipmentForm";
import { opsLoadShippingQueue } from "@/lib/ops/queries";

export default async function OpsShippingPage() {
  const queue = await opsLoadShippingQueue();

  const groupOptions = queue.map((g) => ({
    id: g.id,
    label: `${g.order.id.slice(0, 8)}… · ${g.status} · ${g.shipments.length} shipment rows`,
  }));

  return (
    <>
      <OpsPageHeader
        title="Shipping"
        description="Retail parcels — storefront quotes, automated labels, or manual tracking on Shipment rows."
      />

      <p className="text-[#c9bba8]/80 text-xs rounded-lg border border-dashed border-[#3d3830] px-3 py-2 mb-2">
        Storefront guests pick a delivery tier at checkout; ops can buy the label when ready via{" "}
        <code className="text-[#8FC4C4]/90">POST /api/ops/shipping/purchase-label</code> with a{" "}
        <code className="text-[#8FC4C4]/90">shipmentId</code> that has a saved rate id. Manual tracking below still works.
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <h2 className="text-[13px] font-semibold text-[#f5e5c0]">Queue</h2>
          {queue.length === 0 ? (
            <p className="text-[#c9bba8]/75 text-sm border border-dashed border-[#3d3830] rounded-lg p-8 text-center">
              Nothing queued — merch shipping orders appear once checkout binds retail lines with shipping eligibility.
            </p>
          ) : (
            queue.map((g) => (
              <div key={g.id} id={g.id}>
                <OpsQueueCard
                  href={`/ops/orders/${g.order.id}`}
                  title={`Ship · order ${g.order.id.slice(0, 8)}…`}
                  subtitle={`${g.status} · ${g.shipments.length ? `latest ${g.shipments[0]?.carrier ?? "carrier"} · ${g.shipments[0]?.trackingNumber ?? ""}` : "no tracking rows yet"}`}
                  meta={g.order.status}
                  chips={
                    <>
                      <StateChip label="RETAIL" tone="teal" />
                      <StateChip label={g.status} tone="neutral" />
                    </>
                  }
                />
              </div>
            ))
          )}
        </div>
        <ManualShipmentForm groupOptions={groupOptions} />
      </div>
    </>
  );
}
