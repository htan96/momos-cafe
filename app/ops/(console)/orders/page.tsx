import OpsPageHeader from "@/components/ops/OpsPageHeader";
import OpsQueueCard from "@/components/ops/OpsQueueCard";
import StateChip from "@/components/ops/StateChip";
import { opsLoadOrdersList } from "@/lib/ops/queries";
import { formatUsdFromCents } from "@/lib/ops/formatUsd";

export default async function OpsOrdersPage() {
  const orders = await opsLoadOrdersList(40);

  return (
    <>
      <OpsPageHeader
        title="Orders"
        description="Commerce shell orders — paid lifecycle + fulfillment partitions."
      />
      <div className="grid gap-2 md:grid-cols-2">
        {orders.map((o) => (
          <OpsQueueCard
            key={o.id}
            href={`/ops/orders/${o.id}`}
            title={`Order ${o.id.slice(0, 8)}…`}
            subtitle={`${o.fulfillmentGroups.length} fulfillment groups`}
            meta={formatUsdFromCents(o.totalCents)}
            chips={
              <>
                <StateChip label={o.status} tone="neutral" />
                {o.payments[0] ? (
                  <StateChip label={`pay:${o.payments[0].status}`} tone="teal" />
                ) : null}
              </>
            }
          />
        ))}
      </div>
      {orders.length === 0 ? (
        <p className="mt-6 text-center text-[#c9bba8]/75 text-sm border border-dashed border-[#3d3830] rounded-lg py-10">
          No commerce orders yet — unified checkout will populate this list.
        </p>
      ) : null}
    </>
  );
}
