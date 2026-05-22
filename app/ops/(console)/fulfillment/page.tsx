import Link from "next/link";
import OpsPageHeader from "@/components/ops/OpsPageHeader";
import OpsFulfillmentRowActions from "@/components/ops/OpsFulfillmentRowActions";
import OpsQueueCard from "@/components/ops/OpsQueueCard";
import StateChip from "@/components/ops/StateChip";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import { opsCan } from "@/lib/ops/permissions";
import { OPS_FULFILLMENT_PROGRAM, type OpsFulfillmentProgram } from "@/lib/ops/fulfillmentPrograms";
import { opsLoadFulfillmentBoard } from "@/lib/ops/queries";
import { formatUsdFromCents } from "@/lib/ops/formatUsd";
import type { FulfillmentPipeline } from "@/types/commerce";

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
  const session = await getOpsSession();
  const canFulfillmentWrite = Boolean(session && opsCan(session.role, "fulfillment:write"));

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
        <div className="space-y-2">
          {board.groups.map((g) => {
            const pipe = g.pipeline as FulfillmentPipeline;
            return (
              <div
                key={g.id}
                className="rounded-lg border border-[#3d3830] bg-[#252119] p-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="min-w-0 space-y-1 flex-1">
                  <Link
                    href={`/ops/orders/${g.order.id}`}
                    className="block hover:opacity-90 transition-opacity"
                  >
                    <p className="text-[13px] font-semibold text-[#f5e5c0]">
                      {g.pipeline} · {g.program}
                    </p>
                    <p className="text-[12px] text-[#c9bba8]/85 mt-0.5">
                      Order <span className="font-mono">{g.order.id.slice(0, 8)}…</span> · group{" "}
                      <span className="font-mono">{g.id.slice(0, 8)}…</span>
                    </p>
                  </Link>
                  <div className="flex flex-wrap gap-1 pt-2">
                    <StateChip label={g.status} tone="warn" />
                    <StateChip label={g.order.status} tone="neutral" />
                  </div>
                  <p className="text-[11px] text-[#c9bba8]/65">{formatUsdFromCents(g.order.totalCents)}</p>
                </div>
                <div className="shrink-0 w-full lg:max-w-[min(360px,100%)] border-t lg:border-t-0 lg:border-l border-[#3d3830]/80 lg:pl-4 pt-3 lg:pt-0">
                  <p className="text-[11px] uppercase tracking-wide text-[#c9bba8]/55 mb-2">Transition</p>
                  {pipe !== "KITCHEN" && pipe !== "RETAIL" ? (
                    <p className="text-[12px] text-[#c9bba8]/55">Pipeline `{g.pipeline}` is not transitionable here.</p>
                  ) : (
                    <OpsFulfillmentRowActions
                      orderId={g.order.id}
                      groupId={g.id}
                      pipeline={pipe}
                      status={g.status}
                      canFulfillmentWrite={canFulfillmentWrite}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
