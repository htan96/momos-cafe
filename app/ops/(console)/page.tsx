import type { ReactNode } from "react";
import OpsPageHeader from "@/components/ops/OpsPageHeader";
import OpsQueueCard from "@/components/ops/OpsQueueCard";
import StateChip from "@/components/ops/StateChip";
import { opsLoadTodayQueues } from "@/lib/ops/queries";
import { formatUsdFromCents } from "@/lib/ops/formatUsd";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h2 className="text-[15px] font-semibold text-[#f5e5c0]">{title}</h2>
        {hint ? <p className="text-[11px] text-[#c9bba8]/70">{hint}</p> : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[#c9bba8]/75 text-sm sm:col-span-2 xl:col-span-3 border border-dashed border-[#3d3830] rounded-lg p-6 text-center">
      {children}
    </p>
  );
}

export default async function OpsTodayPage() {
  const q = await opsLoadTodayQueues();

  return (
    <>
      <OpsPageHeader
        title="Today"
        description="Live workload snapshots from commerce, fulfillment groups, shipments, catering, and outbound mail rows — no synthetic SLAs."
      />

      <Section title="Pending payment" hint="Checkout reached order shell; capture still open">
        {q.pendingPaymentOrders.length === 0 ? (
          <EmptyRow>No orders waiting on payment right now.</EmptyRow>
        ) : (
          q.pendingPaymentOrders.map((o) => (
            <OpsQueueCard
              key={o.id}
              href={`/ops/orders/${o.id}`}
              title={`Order ${o.id.slice(0, 8)}…`}
              subtitle="Awaiting successful payment capture"
              meta={formatUsdFromCents(o.totalCents)}
              chips={<StateChip label={o.status} tone="warn" />}
            />
          ))
        )}
      </Section>

      <Section title="Paid — needs fulfillment motion" hint="Open fulfillment groups under paid orders">
        {q.paidNeedingFulfillment.length === 0 ? (
          <EmptyRow>Nothing in-flight — fulfillment groups look complete or uncreated.</EmptyRow>
        ) : (
          q.paidNeedingFulfillment.map((o) => {
            const g0 = o.fulfillmentGroups[0];
            const summary =
              o.fulfillmentGroups.length === 0
                ? "(no groups loaded)"
                : o.fulfillmentGroups
                    .map((fg) => `${fg.pipeline}:${fg.status}`)
                    .slice(0, 3)
                    .join(" · ") + (o.fulfillmentGroups.length > 3 ? " …" : "");
            return (
              <OpsQueueCard
                key={o.id}
                href={`/ops/orders/${o.id}`}
                title={`Order ${o.id.slice(0, 8)}…`}
                subtitle={summary}
                meta={formatUsdFromCents(o.totalCents)}
                chips={
                  <>
                    <StateChip label={o.status} tone="ok" />
                    {g0 ? <StateChip label={g0.pipeline} tone="neutral" /> : null}
                  </>
                }
              />
            );
          })
        )}
      </Section>

      <Section title="Retail labels pending" hint="Shipment rows without tracking on active RETAIL groups">
        {q.shipmentsPendingLabel.length === 0 ? (
          <EmptyRow>No untracked retail shipment rows queued for label purchase.</EmptyRow>
        ) : (
          q.shipmentsPendingLabel.map((s) => {
            const oid = s.fulfillmentGroup.order.id;
            return (
              <OpsQueueCard
                key={s.id}
                href={`/ops/orders/${oid}`}
                title={`Shipment ${s.id.slice(0, 8)}…`}
                subtitle={`Order ${oid.slice(0, 8)}… · ${s.fulfillmentGroup.status}`}
                meta={
                  <span className="text-right leading-tight">
                    {formatUsdFromCents(s.fulfillmentGroup.order.totalCents)}
                    <br />
                    <span className="text-[10px] text-[#c9bba8]/70">
                      {s.selectedShippoRateId ? "rate saved" : "no rate id"}
                    </span>
                  </span>
                }
                chips={
                  <>
                    <StateChip label={`ship:${s.status}`} tone="warn" />
                    <StateChip label="RETAIL" tone="teal" />
                  </>
                }
              />
            );
          })
        )}
      </Section>

      <Section title="Late / stale" hint="Non-terminal paid groups — old update or overdue ready-at">
        {q.lateOrStuck.length === 0 ? (
          <EmptyRow>Nothing stalled by age — kitchen and retail queues look current.</EmptyRow>
        ) : (
          q.lateOrStuck.map((g) => (
            <OpsQueueCard
              key={g.id}
              href={`/ops/orders/${g.order.id}`}
              title={`Order ${g.order.id.slice(0, 8)}…`}
              subtitle={`${g.pipeline} · ${g.program}`}
              meta={formatUsdFromCents(g.order.totalCents)}
              chips={
                <>
                  <StateChip label={g.status} tone="warn" />
                  <StateChip label={g.order.status} tone="neutral" />
                </>
              }
            />
          ))
        )}
      </Section>

      <Section title="Retail shipping in motion" hint="RETAIL fulfillment groups excluding terminal states">
        {q.shipsToday.length === 0 ? (
          <EmptyRow>No shipping-class retail groups in motion — use Shipping console for manual entries.</EmptyRow>
        ) : (
          q.shipsToday.map((g) => (
            <OpsQueueCard
              key={g.id}
              href={`/ops/shipping#${g.id}`}
              title={`Ship · ${g.order.id.slice(0, 8)}…`}
              subtitle={g.status}
              meta={formatUsdFromCents(g.order.totalCents)}
              chips={
                <>
                  <StateChip label="RETAIL" tone="teal" />
                  <StateChip label={g.status} tone="neutral" />
                </>
              }
            />
          ))
        )}
      </Section>

      <Section title="Catering attention" hint="Latest inquiries — CRM handoff until unified catering checkout ships">
        {q.cateringAttention.length === 0 ? (
          <EmptyRow>No recent catering inquiries.</EmptyRow>
        ) : (
          q.cateringAttention.map((c) => (
            <OpsQueueCard
              key={c.id}
              href="/ops/fulfillment?tab=catering"
              title={c.name}
              subtitle={`${c.eventDate} · ${c.guestCount} guests`}
              meta={new Date(c.createdAt).toLocaleDateString()}
              chips={<StateChip label="Inquiry" tone="ok" />}
            />
          ))
        )}
      </Section>

      <Section title="Comms failures" hint="Outbound sends marked failed in EmailMessage">
        {q.commFailures.length === 0 ? (
          <EmptyRow>No failed outbound messages recently.</EmptyRow>
        ) : (
          q.commFailures.map((m) => (
            <OpsQueueCard
              key={m.id}
              href={m.thread?.id ? `/ops/communications/${m.thread.id}` : "/ops/communications"}
              title={m.subject ?? "(no subject)"}
              subtitle={m.fromEmail}
              meta={new Date(m.createdAt).toLocaleString()}
              chips={<StateChip label="FAILED" tone="danger" />}
            />
          ))
        )}
      </Section>
    </>
  );
}
