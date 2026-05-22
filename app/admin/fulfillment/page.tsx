import FulfillmentOperationalCards from "@/components/admin/fulfillment/FulfillmentOperationalCards";
import FulfillmentSuperAdminTechnicalPanel from "@/components/admin/fulfillment/FulfillmentSuperAdminTechnicalPanel";
import Link from "next/link";
import FulfillmentBatchRow from "@/components/operations/FulfillmentBatchRow";
import FulfillmentRowActions from "@/components/operations/FulfillmentRowActions";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import OperationalQueueCard from "@/components/operations/OperationalQueueCard";
import StateToneChip from "@/components/operations/StateToneChip";
import { assertAdminPlatformLayout } from "@/lib/auth/cognito/assertRoleInLayout";
import { loadAdminFulfillmentWorkload } from "@/lib/admin/adminConsoleLoaders";
import { formatUsdFromCents } from "@/lib/ops/formatUsd";
import { OPS_FULFILLMENT_PROGRAM, type OpsFulfillmentProgram } from "@/lib/ops/fulfillmentPrograms";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import { opsCan } from "@/lib/ops/permissions";
import { opsLoadFulfillmentBoard } from "@/lib/ops/queries";
import type { FulfillmentPipeline } from "@/types/commerce";

const tabs: { key: string; label: string; program: OpsFulfillmentProgram }[] = [
  { key: "pickup", label: "Pickup", program: OPS_FULFILLMENT_PROGRAM.PICKUP },
  { key: "shipping", label: "Shipping", program: OPS_FULFILLMENT_PROGRAM.SHIP },
  { key: "catering", label: "Catering", program: OPS_FULFILLMENT_PROGRAM.CATERING },
];

export const dynamic = "force-dynamic";

export default async function AdminFulfillmentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const tabKey = (await searchParams).tab ?? "pickup";
  const activeTab = tabs.find((x) => x.key === tabKey) ?? tabs[0]!;

  const [{ showSuperAdminOperationalLens }, session, { tableRows, batches, metrics }, board] = await Promise.all([
    assertAdminPlatformLayout(),
    getOpsSession(),
    loadAdminFulfillmentWorkload(),
    opsLoadFulfillmentBoard(activeTab.program),
  ]);

  const canFulfillmentWrite = Boolean(session && opsCan(session.role, "fulfillment:write"));

  const programBoardIntro =
    "Move orders forward by program tab—pickup, parcel shipments, or catering—with the same tools as Labels and consolidated shipping.";
  const programBoardIntroSuperAppend =
    " Scripted fulfillment transitions via PATCH /api/ops/fulfillment/[group]/transition, optional retail confirmation gate, catering inquiries—the same consolidated admin shipping backend.";
  const programBoardDescription =
    showSuperAdminOperationalLens ? `${programBoardIntro}${programBoardIntroSuperAppend}` : programBoardIntro;

  return (
    <div className="space-y-10">
      <OpsPageHeader
        title="Fulfillment floor"
        subtitle="See what needs attention today, open the workload list, then use Labels or shipping consoles as needed."
        actions={
          <Link
            href="/admin/shipping"
            className="rounded-lg border border-cream-dark bg-white px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-charcoal hover:bg-cream/80 transition-colors"
          >
            Labels
          </Link>
        }
      />

      <nav className="flex gap-2 flex-wrap">
        {tabs.map((t) => {
          const active = t.key === activeTab.key;
          return (
            <Link
              key={t.key}
              href={`/admin/fulfillment?tab=${t.key}`}
              className={`rounded-lg px-3 py-1.5 text-[13px] border transition-colors ${
                active ?
                  "border-teal-dark/55 bg-teal/[0.1] text-teal-dark"
                : "border-cream-dark/80 text-charcoal/70 hover:border-teal-dark/25"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {/* Admin-Focused Fulfillment — operational cards */}
      <FulfillmentOperationalCards metrics={metrics} packingQueueCount={tableRows.length} />

      <div id="fulfillment-floor-board" className="scroll-mt-28">
        <OpsPanel title="Operational program queue" eyebrow={`Tab · ${activeTab.label}`} description={programBoardDescription}>
          {board.kind === "catering" ?
            board.cateringRows.length === 0 ?
              <p className="text-[13px] text-charcoal/55 border border-dashed border-charcoal/[0.12] rounded-xl p-10 text-center bg-cream/45">
                No catering inquiries surfaced for this sampler.
              </p>
            : <div className="grid gap-3 md:grid-cols-2">
                {board.cateringRows.map((c) => (
                  <OperationalQueueCard
                    key={c.id}
                    href={`mailto:${c.email}`}
                    title={c.name}
                    subtitle={`${c.phone} · ${c.eventDate}`}
                    meta={`${c.guestCount} guests`}
                    chips={
                      <>
                        <StateToneChip label="Catering" tone="ok" />
                        {c.eventType ? <StateToneChip label={c.eventType} tone="neutral" /> : null}
                      </>
                    }
                  />
                ))}
              </div>
          : board.groups.length === 0 ?
            <p className="text-[13px] text-charcoal/55 border border-dashed border-charcoal/[0.12] rounded-xl p-10 text-center bg-cream/45">
              Quiet window — queue empty for this program tab.
            </p>
          : <div className="space-y-3">
              {board.groups.map((g) => {
                const pipe = g.pipeline as FulfillmentPipeline;
                return (
                  <div
                    key={g.id}
                    className="rounded-xl border border-cream-dark/65 bg-white/82 p-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
                  >
                    <div className="min-w-0 space-y-1 flex-1">
                      <Link
                        href={`/admin/orders/${g.order.id}`}
                        className="block hover:opacity-90 transition-opacity"
                      >
                        <p className="text-[13px] font-semibold text-teal-dark">
                          {g.pipeline} · {g.program}
                        </p>
                        <p className="text-[12px] text-charcoal/70 mt-0.5">
                          Order <span className="font-mono">{g.order.id.slice(0, 8)}…</span> · group{" "}
                          <span className="font-mono">{g.id.slice(0, 8)}…</span>
                        </p>
                      </Link>
                      <div className="flex flex-wrap gap-1 pt-2">
                        <StateToneChip label={g.status} tone="warn" />
                        <StateToneChip label={g.order.status} tone="neutral" />
                      </div>
                      <p className="text-[11px] text-charcoal/52">{formatUsdFromCents(g.order.totalCents)}</p>
                    </div>
                    <div className="shrink-0 w-full lg:max-w-[min(380px,100%)] border-t lg:border-t-0 lg:border-l border-cream-dark/65 lg:pl-5 pt-3 lg:pt-0 space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal/45">Fulfillment controls</p>
                      {pipe !== "KITCHEN" && pipe !== "RETAIL" ?
                        <p className="text-[12px] text-charcoal/52">Pipeline `{g.pipeline}` is not scripted here.</p>
                      : <FulfillmentRowActions
                          orderId={g.order.id}
                          groupId={g.id}
                          pipeline={pipe}
                          status={g.status}
                          fulfillmentApprovedAt={g.fulfillmentApprovedAt}
                          canFulfillmentWrite={canFulfillmentWrite}
                        />
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          }
        </OpsPanel>
      </div>

      {showSuperAdminOperationalLens ?
        <div className="space-y-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Super-admin · technical detail</p>
          <FulfillmentSuperAdminTechnicalPanel metrics={metrics} />
        </div>
      : null}

      <div id="fulfillment-packing-queue" className="scroll-mt-28">
        <OpsPanel
          title="Packing queue"
          eyebrow="Open orders"
          description="Paid orders currently in fulfillment—prioritize packing or handoff from this list."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-cream-dark/70 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
                  <th className="py-2 pr-3">Slot</th>
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2 pr-3">Items</th>
                  <th className="py-2 pr-3">ETA</th>
                  <th className="py-2 pr-3">Station</th>
                  <th className="py-2">State</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ?
                  <tr>
                    <td className="py-4 text-charcoal/55" colSpan={6}>
                      Nothing in the packing preview right now.
                    </td>
                  </tr>
                : tableRows.map((r) => (
                    <tr key={r.id} className="border-b border-cream-dark/40">
                      <td className="py-3 font-mono text-charcoal">{r.slot}</td>
                      <td className="py-3 font-semibold">{r.orderRef}</td>
                      <td className="py-3 text-charcoal/70">{r.items}</td>
                      <td className="py-3 text-charcoal/60">{r.eta}</td>
                      <td className="py-3 text-charcoal/60">{r.station}</td>
                      <td className="py-3">
                        <OpsStatusPill variant={r.variant} />
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </OpsPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OpsPanel title="Labels Pending" eyebrow="Retail shipments awaiting tracking">
          <div className="space-y-3">
            {batches.length === 0 ?
              <p className="text-[13px] text-charcoal/55">No shipments are missing tracking today.</p>
            : batches.slice(0, 8).map((b) => <FulfillmentBatchRow key={b.id} {...b} />)}
          </div>
        </OpsPanel>

        <div id="fulfillment-slip-preview" className="scroll-mt-28">
          <OpsPanel title="Sample Packing Slip" eyebrow="Template">
            <div className="rounded-xl border border-dashed border-charcoal/[0.12] bg-cream/55 px-4 py-8 text-center space-y-2">
              <p className="text-[13px] font-semibold text-charcoal">Momos Café · fulfillment label</p>
              <p className="text-[12px] text-charcoal/65 mt-4">
                Final artwork pulls live order details when you print from the storefront flow.
              </p>
            </div>
          </OpsPanel>
        </div>
      </div>
    </div>
  );
}
