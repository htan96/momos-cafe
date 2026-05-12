import Link from "next/link";
import OpsPageHeader from "@/components/ops/OpsPageHeader";
import OpsQueueCard from "@/components/ops/OpsQueueCard";
import StateChip from "@/components/ops/StateChip";
import { OPS_FULFILLMENT_PROGRAM, type OpsFulfillmentProgram } from "@/lib/ops/fulfillmentPrograms";
import { opsLoadFulfillmentBoard } from "@/lib/ops/queries";
import { formatUsdFromCents } from "@/lib/ops/formatUsd";

const tabs: { key: string; label: string; program: OpsFulfillmentProgram }[] = [
  { key: "pickup", label: "Pickup", program: OPS_FULFILLMENT_PROGRAM.PICKUP },
  { key: "shipping", label: "Shipping", program: OPS_FULFILLMENT_PROGRAM.SHIP },
  { key: "catering", label: "Catering", program: OPS_FULFILLMENT_PROGRAM.CATERING },
];

export default async function OpsFulfillmentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const tabKey = (await searchParams).tab ?? "pickup";
  const activeTab = tabs.find((x) => x.key === tabKey) ?? tabs[0]!;
  const board = await opsLoadFulfillmentBoard(activeTab.program);

  return (
    <>
      <OpsPageHeader
        title="Fulfillment"
        description="Partitioned by operational program — pickup-first kitchen/retail, parcel shipping, and catering inquiries."
      />

      <nav className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((t) => {
          const active = t.key === activeTab.key;
          return (
            <Link
              key={t.key}
              href={`/ops/fulfillment?tab=${t.key}`}
              className={`rounded-md px-3 py-1.5 text-[13px] border transition-colors ${
                active
                  ? "border-[#2f6d66]/60 bg-[#2f6d66]/20 text-[#f5e5c0]"
                  : "border-[#3d3830] text-[#c9bba8] hover:border-[#2f6d66]/35"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {board.kind === "catering" ? (
        board.cateringRows.length === 0 ? (
          <p className="text-[#c9bba8]/75 text-sm border border-dashed border-[#3d3830] rounded-lg p-8 text-center">
            No catering inquiries yet — web form posts land here for ops follow-up.
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {board.cateringRows.map((c) => (
              <OpsQueueCard
                key={c.id}
                href={`mailto:${c.email}`}
                title={c.name}
                subtitle={`${c.phone} · ${c.eventDate}`}
                meta={`${c.guestCount} guests`}
                chips={
                  <>
                    <StateChip label="Catering" tone="ok" />
                    {c.eventType ? <StateChip label={c.eventType} tone="neutral" /> : null}
                  </>
                }
              />
            ))}
          </div>
        )
      ) : board.groups.length === 0 ? (
        <p className="text-[#c9bba8]/75 text-sm border border-dashed border-[#3d3830] rounded-lg p-8 text-center">
          Queue empty for this tab — nice calm service window.
        </p>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {board.groups.map((g) => (
            <OpsQueueCard
              key={g.id}
              href={`/ops/orders/${g.order.id}`}
              title={`${g.pipeline} · ${g.program}`}
              subtitle={`Group ${g.id.slice(0, 8)}…`}
              meta={formatUsdFromCents(g.order.totalCents)}
              chips={
                <>
                  <StateChip label={g.status} tone="warn" />
                  <StateChip label={g.order.status} tone="neutral" />
                </>
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
