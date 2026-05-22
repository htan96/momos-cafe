import Link from "next/link";
import FulfillmentBatchRow from "@/components/operations/FulfillmentBatchRow";
import OperationalAlertStrip from "@/components/operations/OperationalAlertStrip";
import OperationalQueueCard from "@/components/operations/OperationalQueueCard";
import OpsMetricQuiet from "@/components/operations/OpsMetricQuiet";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import ShipmentExceptionRow from "@/components/operations/ShipmentExceptionRow";
import StateToneChip from "@/components/operations/StateToneChip";
import WorkflowTimeline from "@/components/operations/WorkflowTimeline";
import type { AdminQueueSummary } from "@/lib/admin/adminConsoleLoaders";
import { loadAdminHomeDashboard } from "@/lib/admin/adminConsoleLoaders";
import { formatUsdFromCents } from "@/lib/ops/formatUsd";
import { opsLoadTodayQueues } from "@/lib/ops/queries";

/** Primary inbox for each queue row — URLs must stay under `/admin` (Cognito + nav). */
const QUEUE_PRIMARY_HREF: Record<string, string> = {
  "q-pack": "/admin/fulfillment",
  "q-label": "/admin/shipping",
  "q-catering": "/admin/catering-inquiries",
  "q-support": "/admin/support",
  "q-exc": "/admin/shipping",
  "q-refund": "/admin/refunds",
  "q-comms": "/admin/communications",
};

function QueueActionLink({ summary }: { summary: AdminQueueSummary }) {
  const href = QUEUE_PRIMARY_HREF[summary.id];
  return href ? (
    <Link
      href={href}
      className="text-[12px] font-semibold uppercase tracking-[0.1em] text-teal-dark hover:underline underline-offset-4 whitespace-nowrap"
    >
      Open
    </Link>
  ) : (
    <span className="text-[12px] text-charcoal/40">—</span>
  );
}

function prioritizeQueues(rows: AdminQueueSummary[]): AdminQueueSummary[] {
  const withSignal = rows.filter((q) => q.depth > 0);
  const quiet = rows.filter((q) => q.depth === 0);
  return [...withSignal, ...quiet];
}

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const [dash, todayQueues] = await Promise.all([
    loadAdminHomeDashboard(),
    opsLoadTodayQueues(),
  ]);
  const packDepth = dash.queueSummaries.find((q) => q.id === "q-pack")?.depth ?? 0;
  const labelDepth = dash.queueSummaries.find((q) => q.id === "q-label")?.depth ?? 0;
  const queued = prioritizeQueues(dash.queueSummaries);

  return (
    <div className="space-y-10">
      <OpsPageHeader
        title="Admin home"
        subtitle="Queues and previews read from operational tables once per load. Depth is a row count—not a SLA score."
        actions={
          <Link
            href="/admin/queues"
            className="rounded-lg border border-cream-dark bg-white px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-charcoal hover:bg-cream/80 transition-colors"
          >
            All queues
          </Link>
        }
      />

      <OpsPanel
        eyebrow="Today · workload"
        title="Live commerce slices"
        description="Cards reuse `opsLoadTodayQueues`; deep links resolve on `/admin/orders`, `/admin/fulfillment`, or `/admin/communications`."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Paid — needs fulfillment</p>
            <div className="grid gap-2">
              {todayQueues.paidNeedingFulfillment.length === 0 ?
                <p className="text-[13px] text-charcoal/55">Nothing surfaced for this sampler.</p>
              : todayQueues.paidNeedingFulfillment.slice(0, 4).map((o) => {
                  const fg = o.fulfillmentGroups[0];
                  const summary =
                    o.fulfillmentGroups.length === 0
                      ? "(no groups)"
                      : o.fulfillmentGroups.map((x) => `${x.pipeline}:${x.status}`).slice(0, 2).join(" · ");
                  return (
                    <OperationalQueueCard
                      key={o.id}
                      href={`/admin/orders/${o.id}`}
                      title={`Order ${o.id.slice(0, 8)}…`}
                      subtitle={summary}
                      meta={formatUsdFromCents(o.totalCents)}
                      chips={
                        <>
                          <StateToneChip label={o.status} tone="ok" />
                          {fg ? <StateToneChip label={fg.pipeline} tone="neutral" /> : null}
                        </>
                      }
                    />
                  );
                })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Retail labels pending</p>
            <div className="grid gap-2">
              {todayQueues.shipmentsPendingLabel.length === 0 ?
                <p className="text-[13px] text-charcoal/55">No untracked retail shipment rows surfaced.</p>
              : todayQueues.shipmentsPendingLabel.slice(0, 4).map((s) => {
                  const oid = s.fulfillmentGroup.order.id;
                  return (
                    <OperationalQueueCard
                      key={s.id}
                      href={`/admin/orders/${oid}`}
                      title={`Shipment ${s.id.slice(0, 8)}…`}
                      subtitle={`Order ${oid.slice(0, 8)}… · ${s.fulfillmentGroup.status}`}
                      meta={
                        <span className="text-right leading-tight inline-block">
                          {formatUsdFromCents(s.fulfillmentGroup.order.totalCents)}
                          <span className="block text-[10px] text-charcoal/48">
                            {s.selectedShippoRateId ? "rate saved" : "no rate id"}
                          </span>
                        </span>
                      }
                      chips={
                        <>
                          <StateToneChip label={`ship:${s.status}`} tone="warn" />
                          <StateToneChip label="RETAIL" tone="teal" />
                        </>
                      }
                    />
                  );
                })}
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mt-6">Outbound comm failures</p>
            <div className="grid gap-2">
              {todayQueues.commFailures.length === 0 ?
                <p className="text-[13px] text-charcoal/55">No recorded failures recently.</p>
              : todayQueues.commFailures.slice(0, 3).map((m) => (
                  <OperationalQueueCard
                    key={m.id}
                    href="/admin/communications"
                    title={m.subject ?? "(no subject)"}
                    subtitle={m.fromEmail}
                    meta={new Date(m.createdAt).toLocaleString()}
                    chips={<StateToneChip label="FAILED" tone="danger" />}
                  />
                ))}
            </div>
          </div>
        </div>
      </OpsPanel>

      <section aria-label="Incidents and error activity" className="space-y-3">
        {dash.alerts.length > 0 ? (
          <>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-charcoal/45">
              Active incidents · recent critical errors
            </h2>
            <OperationalAlertStrip alerts={dash.alerts} />
          </>
        ) : (
          <OpsPanel eyebrow="Status" title="Incidents · error-severity activity" className="border-dashed border-cream-dark/80">
            <p className="text-[13px] text-charcoal/58 leading-relaxed">
              Nothing to show here for this page load — no unresolved incidents from the active-incident loader and no recent
              error‑severity operational activity signals in window.
            </p>
            <p className="text-[12px] text-charcoal/48 mt-2">
              Governance views stay separate in Super Admin when you need broader platform triage.
            </p>
          </OpsPanel>
        )}
      </section>

      <section aria-label="Operational queues">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-charcoal/45 mb-4">
          Queues needing attention first
        </h2>
        <div className="overflow-x-auto rounded-xl border border-cream-dark/70 bg-white/85">
          <table className="min-w-full text-left text-[13px]">
            <thead className="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 border-b border-cream-dark/60">
              <tr>
                <th className="px-4 py-3 font-semibold">Queue</th>
                <th className="px-4 py-3 font-semibold">Depth</th>
                <th className="px-4 py-3 font-semibold">Oldest · relative</th>
                <th className="px-4 py-3 font-semibold w-36">Outcome</th>
                <th className="px-4 py-3 font-semibold text-right">Jump</th>
              </tr>
            </thead>
            <tbody>
              {queued.map((q) => (
                <tr key={q.id} className="border-b border-cream-dark/40 last:border-b-0">
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-charcoal">{q.name}</span>
                      <OpsStatusPill variant={q.status} />
                    </div>
                    <p className="text-[11px] text-charcoal/50 mt-1 leading-snug">{q.slaHint}</p>
                  </td>
                  <td className="px-4 py-3 align-middle font-display text-xl text-charcoal tabular-nums">{q.depth}</td>
                  <td className="px-4 py-3 align-middle text-charcoal/75">{q.oldestWait}</td>
                  <td className="px-4 py-3 align-middle text-[12px] text-charcoal/55">
                    {q.depth === 0 ? (
                      <span className="text-charcoal/45">Quiet — zero matching rows.</span>
                    ) : (
                      <>Work present — resolve on the linked screen.</>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    <QueueActionLink summary={q} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-charcoal/45 mt-3">
          Supporting detail for column definitions lives on{" "}
          <Link href="/admin/queues" className="text-teal-dark font-semibold hover:underline underline-offset-4">
            /admin/queues
          </Link>
          .
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <OpsPanel
          eyebrow="Fulfillment · shipping"
          title="Open groups and retail labels pending"
          description="Counts duplicate the queue totals above—they are grounded in fulfillment groups with paid orders (pack) and retail shipments missing tracking (`q-label`)."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <OpsMetricQuiet label="Open fulfillment groups (paid lifecycle)" value={String(packDepth)} hint="Same definition as Fulfillment queue below" />
            <OpsMetricQuiet label="Retail shipments without tracking" value={String(labelDepth)} hint="Same definition as Labels pending queue below" />
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/45">Oldest surfaced groups</p>
            {dash.nextPackPreview.length === 0 ? (
              <p className="text-[13px] text-charcoal/55">No fulfillment groups available in this preview slice.</p>
            ) : (
              dash.nextPackPreview.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap justify-between gap-2 rounded-lg border border-cream-dark/65 bg-cream/[0.3] px-3 py-2 text-[13px]"
                >
                  <span className="font-semibold text-charcoal">
                    {r.orderRef} <span className="font-normal text-charcoal/58">· {r.station}</span>
                  </span>
                  <OpsStatusPill variant={r.variant} />
                </div>
              ))
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-4">
            <Link
              href="/admin/fulfillment"
              className="text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-dark hover:underline underline-offset-4"
            >
              Fulfillment →
            </Link>
            <Link
              href="/admin/shipping"
              className="text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-dark hover:underline underline-offset-4"
            >
              Shipping →
            </Link>
          </div>
        </OpsPanel>

        <OpsPanel eyebrow="Backlogs" title="Support and refunds">
          <p className="text-[13px] text-charcoal/55 leading-relaxed mb-5">
            Counts mirror the queues table; open the consoles for resolution paths and timelines.
          </p>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Operational support issues</p>
              <p className="font-display text-4xl text-charcoal mt-1">{dash.supportSummary.open}</p>
              <p className="text-[12px] text-charcoal/50 mt-2">Oldest open · {dash.supportSummary.oldestWaiting}</p>
              <Link
                href="/admin/support"
                className="inline-block mt-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-dark hover:underline underline-offset-4"
              >
                Support →
              </Link>
            </div>
            <div className="border-t border-cream-dark/50 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Refund cases in flight</p>
              <p className="font-display text-4xl text-charcoal mt-1">
                {dash.queueSummaries.find((q) => q.id === "q-refund")?.depth ?? 0}
              </p>
              <p className="text-[12px] text-charcoal/50 mt-2">
                Oldest creation ·{" "}
                <span className="font-semibold text-charcoal">
                  {dash.queueSummaries.find((q) => q.id === "q-refund")?.oldestWait ?? "—"}
                </span>
              </p>
              <Link
                href="/admin/refunds"
                className="inline-block mt-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-dark hover:underline underline-offset-4"
              >
                Refunds →
              </Link>
            </div>
          </div>
        </OpsPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OpsPanel title="Shipment exceptions" eyebrow="Carrier states loaded here">
          <div className="space-y-3">
            {dash.shipmentExceptions.length === 0 ? (
              <p className="text-[13px] text-charcoal/58">No shipments marked exception or return-initiated—empty is expected when carriers are steady.</p>
            ) : (
              dash.shipmentExceptions.map((e) => <ShipmentExceptionRow key={e.id} {...e} />)
            )}
          </div>
        </OpsPanel>

        <WorkflowTimeline
          eyebrow="Activity feed"
          title="Latest operational entries"
          steps={
            dash.activitySteps.length
              ? dash.activitySteps
              : [
                  {
                    id: "empty",
                    label: "No timeline rows loaded",
                    meta: "When activity rows exist, newest steps appear without fabricating SLA math.",
                    at: "—",
                    variant: "muted",
                  },
                ]
          }
        />
      </div>

      <OpsPanel eyebrow="Catering" title="Inquiry snapshots from loader" description="Kanban buckets follow CateringInquiryStatus in DB; empty lanes are intentional.">
        <div className="grid gap-3 md:grid-cols-4">
          {dash.cateringKanban.map((col) => (
            <div key={col.id} className="rounded-xl border border-cream-dark/70 bg-white/80 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-dark">{col.title}</p>
              <p className="text-[11px] text-charcoal/50 mt-1">{col.hint}</p>
              <ul className="mt-3 space-y-2">
                {col.cards.length === 0 ? (
                  <li className="text-[12px] text-charcoal/50">No rows loaded in this column.</li>
                ) : (
                  col.cards.map((c) => (
                    <li key={c.id} className="rounded-lg border border-cream-dark/60 px-2.5 py-2 bg-cream/[0.25]">
                      <p className="text-[12px] font-semibold text-charcoal leading-snug">{c.title}</p>
                      <p className="text-[11px] text-charcoal/50 mt-1">{c.guest}</p>
                      <p className="text-[11px] text-teal-dark/85 mt-1">{c.pickupWindow}</p>
                      <div className="mt-2 flex justify-between items-center gap-2">
                        <span className="text-[10px] text-charcoal/45">{c.headcount}</span>
                        <OpsStatusPill variant={c.variant} />
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/45 mb-2">Label-pending shipments preview</p>
          {dash.labelBatchPreview ? (
            <FulfillmentBatchRow {...dash.labelBatchPreview} />
          ) : (
            <p className="text-[13px] text-charcoal/58">No label-pending shipments in the batch preview for this load.</p>
          )}
        </div>
        <Link
          href="/admin/catering-orders"
          className="inline-block mt-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-dark hover:underline underline-offset-4"
        >
          Catering orders board →
        </Link>
      </OpsPanel>
    </div>
  );
}
