import OperationalQueueCard from "@/components/operations/OperationalQueueCard";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import StateToneChip from "@/components/operations/StateToneChip";
import { opsLoadOrdersList } from "@/lib/ops/queries";
import { formatUsdFromCents } from "@/lib/ops/formatUsd";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await opsLoadOrdersList(40);

  return (
    <div className="space-y-8">
      <OpsPageHeader
        title="Commerce orders"
        subtitle="Paid lifecycle + fulfillment partitions — deep links hydrate `OperationalOrderConsole` with webhooks and activity."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {orders.map((o) => (
          <OperationalQueueCard
            key={o.id}
            href={`/admin/orders/${o.id}`}
            title={`Order ${o.id.slice(0, 8)}…`}
            subtitle={`${o.fulfillmentGroups.length} fulfillment groups`}
            meta={formatUsdFromCents(o.totalCents)}
            chips={
              <>
                <StateToneChip label={o.status} tone="neutral" />
                {o.payments[0] ? <StateToneChip label={`pay:${o.payments[0].status}`} tone="teal" /> : null}
              </>
            }
          />
        ))}
      </div>
      {orders.length === 0 ?
        <p className="text-center text-[13px] text-charcoal/55 border border-dashed border-charcoal/[0.12] rounded-xl py-12 bg-cream/40">
          No commerce orders surfaced for this paging window.
        </p>
      : null}
    </div>
  );
}
