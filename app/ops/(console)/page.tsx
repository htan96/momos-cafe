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

export default async function OpsTodayPage() {
  const q = await opsLoadTodayQueues();

  return (
    <>
      <OpsPageHeader
        title="Today"
        description="Operational snapshot — paid work that needs eyes, ship-ready retail, catering leads, and mail failures."
      />

      <Section title="Late / stuck" hint="Non-terminal groups on paid orders past SLA heuristics">
        {q.lateOrStuck.length === 0 ? (
          <p className="text-[#c9bba8]/75 text-sm sm:col-span-2 xl:col-span-3 border border-dashed border-[#3d3830] rounded-lg p-6 text-center">
            Nothing stuck — kitchen and retail queues look clear.
          </p>
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

      <Section title="Ships today" hint="Retail groups classified for carrier fulfillment">
        {q.shipsToday.length === 0 ? (
          <p className="text-[#c9bba8]/75 text-sm sm:col-span-2 xl:col-span-3 border border-dashed border-[#3d3830] rounded-lg p-6 text-center">
            No shipping-class retail groups in motion — check Shipping console for manual entries.
          </p>
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
          <p className="text-[#c9bba8]/75 text-sm sm:col-span-2 xl:col-span-3 border border-dashed border-[#3d3830] rounded-lg p-6 text-center">
            No recent catering inquiries.
          </p>
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
          <p className="text-[#c9bba8]/75 text-sm sm:col-span-2 xl:col-span-3 border border-dashed border-[#3d3830] rounded-lg p-6 text-center">
            No failed outbound messages recently.
          </p>
        ) : (
          q.commFailures.map((m) => (
            <OpsQueueCard
              key={m.id}
              href={
                m.thread?.id ? `/ops/communications/${m.thread.id}` : "/ops/communications"
              }
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
