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
import type { AdminHomeDashboardPayload, AdminQueueSummary } from "@/lib/admin/adminConsoleLoaders";
import { formatUsdFromCents } from "@/lib/ops/formatUsd";
import { opsLoadTodayQueues } from "@/lib/ops/queries";

type OpsTodayQueues = Awaited<ReturnType<typeof opsLoadTodayQueues>>;

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

function prioritizeQueues(rows: AdminQueueSummary[]): AdminQueueSummary[] {
  const withSignal = rows.filter((q) => q.depth > 0);
  const quiet = rows.filter((q) => q.depth === 0);
  return [...withSignal, ...quiet];
}

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

function titleizeUnderscores(raw: string): string {
  return raw
    .split(/_/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function fulfillmentSummaryForAudience(
  groups: OpsTodayQueues["paidNeedingFulfillment"][number]["fulfillmentGroups"],
  operationalLens: boolean
): string {
  if (groups.length === 0) return "(no fulfillment group yet)";
  if (!operationalLens) {
    return groups
      .map((g) => `${titleizeUnderscores(g.pipeline)} · ${titleizeUnderscores(g.status)}`)
      .slice(0, 2)
      .join(" · ");
  }
  return groups.map((x) => `${x.pipeline}:${x.status}`).slice(0, 2).join(" · ");
}

function shipmentChipLabel(status: string, operationalLens: boolean): string {
  if (operationalLens) return `ship:${status}`;
  return titleizeUnderscores(status);
}

export default function AdminHomeDashboardView(props: {
  operationalLens: boolean;
  dash: AdminHomeDashboardPayload;
  todayQueues: OpsTodayQueues;
}) {
  const { operationalLens, dash, todayQueues } = props;
  const packDepth = dash.queueSummaries.find((q) => q.id === "q-pack")?.depth ?? 0;
  const labelDepth = dash.queueSummaries.find((q) => q.id === "q-label")?.depth ?? 0;
  const queued = prioritizeQueues(dash.queueSummaries);

  const todayOverview = (
    <OpsPanel
      eyebrow={operationalLens ? "Today · workload" : "Snapshots"}
      title={operationalLens ? "Live commerce slices" : "What needs attention today"}
      description={
        operationalLens ?
          "Cards reuse `opsLoadTodayQueues`; deep links resolve on `/admin/orders`, `/admin/fulfillment`, or `/admin/communications`."
        : "Shortcuts to orders, shipments, and customer email issues from the last day or so—not a formal report."
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
            {operationalLens ? "Paid — needs fulfillment" : "Paid orders still in fulfillment"}
          </p>
          <div className="grid gap-2">
            {todayQueues.paidNeedingFulfillment.length === 0 ?
              <p className="text-[13px] text-charcoal/55">
                {operationalLens ?
                  "Nothing surfaced for this sampler."
                : "No paid orders are waiting on fulfillment right now."}
              </p>
            : todayQueues.paidNeedingFulfillment.slice(0, 4).map((o) => {
                const fg = o.fulfillmentGroups[0];
                const summary = fulfillmentSummaryForAudience(o.fulfillmentGroups, operationalLens);
                return (
                  <OperationalQueueCard
                    key={o.id}
                    href={`/admin/orders/${o.id}`}
                    title={`Order ${o.id.slice(0, 8)}…`}
                    subtitle={summary}
                    meta={formatUsdFromCents(o.totalCents)}
                    chips={
                      <>
                        <StateToneChip
                          label={operationalLens ? o.status : titleizeUnderscores(o.status)}
                          tone="ok"
                        />
                        {fg ? (
                          <StateToneChip label={titleizeUnderscores(fg.pipeline)} tone="neutral" />
                        ) : null}
                      </>
                    }
                  />
                );
              })}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
            {operationalLens ? "Retail labels pending" : "Shipments awaiting labels"}
          </p>
          <div className="grid gap-2">
            {todayQueues.shipmentsPendingLabel.length === 0 ?
              <p className="text-[13px] text-charcoal/55">
                {operationalLens ?
                  "No untracked retail shipment rows surfaced."
                : "Every retail shipment on file already has tracking."}
              </p>
            : todayQueues.shipmentsPendingLabel.slice(0, 4).map((s) => {
                const oid = s.fulfillmentGroup.order.id;
                return (
                  <OperationalQueueCard
                    key={s.id}
                    href={`/admin/orders/${oid}`}
                    title={`Shipment ${s.id.slice(0, 8)}…`}
                    subtitle={`Order ${oid.slice(0, 8)}… · ${titleizeUnderscores(s.fulfillmentGroup.status)}`}
                    meta={
                      <span className="text-right leading-tight inline-block">
                        {formatUsdFromCents(s.fulfillmentGroup.order.totalCents)}
                        <span className="block text-[10px] text-charcoal/48">
                          {operationalLens ?
                            s.selectedShippoRateId ? "rate saved" : "no rate id"
                          : s.selectedShippoRateId ? "Carrier rate saved" : "Choose a carrier rate"}
                        </span>
                      </span>
                    }
                    chips={
                      <>
                        <StateToneChip label={shipmentChipLabel(s.status, operationalLens)} tone="warn" />
                        <StateToneChip label={operationalLens ? "RETAIL" : "Retail shipment"} tone="teal" />
                      </>
                    }
                  />
                );
              })}
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mt-6">
            {operationalLens ? "Outbound comm failures" : "Customer emails that didn't send"}
          </p>
          <div className="grid gap-2">
            {todayQueues.commFailures.length === 0 ?
              <p className="text-[13px] text-charcoal/55">
                {operationalLens ?
                  "No recorded failures recently."
                : "No failed outbound emails surfaced in this preview."}
              </p>
            : todayQueues.commFailures.slice(0, 3).map((m) => (
                  <OperationalQueueCard
                    key={m.id}
                    href="/admin/communications"
                    title={m.subject ?? "(no subject)"}
                    subtitle={m.fromEmail}
                    meta={new Date(m.createdAt).toLocaleString()}
                    chips={<StateToneChip label={operationalLens ? "FAILED" : "Needs follow-up"} tone="danger" />}
                  />
                ))}
          </div>
        </div>
      </div>
    </OpsPanel>
  );

  return (
    <div className="space-y-10">
      <OpsPageHeader
        title={operationalLens ? "Admin home" : "Operations home"}
        subtitle={
          operationalLens ?
            "Queues and previews read from operational tables once per load. Depth is a row count—not a SLA score."
          : "Open items are grouped by inbox. Depth is simply how many rows are waiting—not a timed SLA."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {operationalLens ?
              <Link
                href="/super-admin"
                className="rounded-lg border border-teal-dark/35 bg-teal/[0.08] px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-dark hover:bg-teal/15 transition-colors"
              >
                Platform home
              </Link>
            : null}
            <Link
              href="/admin/queues"
              className="rounded-lg border border-cream-dark bg-white px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-charcoal hover:bg-cream/80 transition-colors"
            >
              All queues
            </Link>
          </div>
        }
      />

      {operationalLens ?
        todayOverview
      : (
        <details className="rounded-2xl border border-cream-dark/70 bg-white/70 shadow-[0_1px_2px_rgb(41_53_61/0.04)] open:[&_[data-details-chevron]]:rotate-180">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <span
                aria-hidden
                data-details-chevron
                className="inline-block transition-transform border border-transparent text-teal-dark text-lg leading-none"
              >
                ▾
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/45">
                  Optional · today&apos;s examples
                </p>
                <p className="text-[13px] text-charcoal/70 mt-0.5">
                  Expand to preview specific paid orders, label gaps, or failed emails—everything here also appears in its
                  main inbox below.
                </p>
              </div>
            </div>
          </summary>
          <div className="border-t border-cream-dark/50 px-1 pb-1 pt-0">{todayOverview}</div>
        </details>
      )}

      {operationalLens ?
        (
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
        )
      : null}

      <section aria-label="Operational queues">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-charcoal/45 mb-4">
          {operationalLens ? "Queues needing attention first" : "Where to focus first"}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-cream-dark/70 bg-white/85">
          <table className="min-w-full text-left text-[13px]">
            <thead className="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 border-b border-cream-dark/60">
              <tr>
                <th className="px-4 py-3 font-semibold">{operationalLens ? "Queue" : "Work area"}</th>
                <th className="px-4 py-3 font-semibold">{operationalLens ? "Depth" : "Open items"}</th>
                <th className="px-4 py-3 font-semibold">{operationalLens ? "Oldest · relative" : "Longest waiting"}</th>
                <th className="px-4 py-3 font-semibold w-36">{operationalLens ? "Outcome" : "Notes"}</th>
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
                    {q.depth === 0 ?
                      operationalLens ?
                        <span className="text-charcoal/45">Quiet — zero matching rows.</span>
                      : <span className="text-charcoal/45">Nothing queued here.</span>
                    : operationalLens ?
                      <>Work present — resolve on the linked screen.</>
                    : <>Open its inbox above to resolve the oldest items.</>}
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
          {operationalLens ?
            <>
              Supporting detail for column definitions lives on{" "}
              <Link href="/admin/queues" className="text-teal-dark font-semibold hover:underline underline-offset-4">
                /admin/queues
              </Link>
              .
            </>
          : (
            <>
              Column definitions and technical notes live on{" "}
              <Link href="/admin/queues" className="text-teal-dark font-semibold hover:underline underline-offset-4">
                the queues page
              </Link>
              .
            </>
          )}
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <OpsPanel
          eyebrow="Fulfillment · shipping"
          title={operationalLens ? "Open groups and retail labels pending" : "Fulfillment & shipping workload"}
          description={
            operationalLens ?
              "Counts duplicate the queue totals above—they are grounded in fulfillment groups with paid orders (pack) and retail shipments missing tracking (`q-label`)."
            : undefined
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <OpsMetricQuiet
              label={
                operationalLens ?
                  "Open fulfillment groups (paid lifecycle)"
                : "Open fulfillments on paid orders"
              }
              value={String(packDepth)}
              hint={
                operationalLens ? "Same definition as Fulfillment queue below" : "Matches ‘Orders to pack or ship’ in the table."
              }
            />
            <OpsMetricQuiet
              label={
                operationalLens ?
                  "Retail shipments without tracking"
                : "Shipments still needing tracking"
              }
              value={String(labelDepth)}
              hint={
                operationalLens ? "Same definition as Labels pending queue below" : "Matches ‘Shipments needing labels’ in the table."
              }
            />
          </div>
          {(operationalLens || dash.nextPackPreview.length > 0) ?
            (
              <div className="mt-6 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/45">
                  {operationalLens ? "Oldest surfaced groups" : "Recent orders in the fulfillment queue"}
                </p>
                {dash.nextPackPreview.length === 0 ?
                  <p className="text-[13px] text-charcoal/55">
                    No fulfillment groups available in this preview slice.
                  </p>
                : dash.nextPackPreview.map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-wrap justify-between gap-2 rounded-lg border border-cream-dark/65 bg-cream/[0.3] px-3 py-2 text-[13px]"
                      >
                        <span className="font-semibold text-charcoal">
                          {r.orderRef}{" "}
                          <span className="font-normal text-charcoal/58">{operationalLens ? ` · ${r.station}` : ""}</span>
                        </span>
                        <OpsStatusPill variant={r.variant} />
                      </div>
                    ))}
              </div>
            )
          : null}
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

        <OpsPanel eyebrow={operationalLens ? "Backlogs" : "Service desks"} title="Support and refunds">
          <p className="text-[13px] text-charcoal/55 leading-relaxed mb-5">
            {operationalLens ?
              "Counts mirror the queues table; open the consoles for resolution paths and timelines."
            : "These counts mirror the support and refund queues—open each console for transcripts and timelines."}
          </p>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
                {operationalLens ? "Operational support issues" : "Open support conversations"}
              </p>
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
                {operationalLens ? "Refund cases in flight" : "Refunds awaiting action"}
              </p>
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
        <OpsPanel
          title="Shipment exceptions"
          eyebrow={operationalLens ? "Carrier states loaded here" : "Carrier-reported problems"}
        >
          <div className="space-y-3">
            {dash.shipmentExceptions.length === 0 ?
              <p className="text-[13px] text-charcoal/58">
                {operationalLens ?
                  "No shipments marked exception or return-initiated—empty is expected when carriers are steady."
                : "No shipments are flagged by the carrier right now."}
              </p>
            : dash.shipmentExceptions.map((e) => <ShipmentExceptionRow key={e.id} {...e} />)}
          </div>
        </OpsPanel>

        {operationalLens ?
          (
            <WorkflowTimeline
              eyebrow="Activity feed"
              title="Latest operational entries"
              steps={
                dash.activitySteps.length ?
                  dash.activitySteps
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
          )
        : (
          <OpsPanel eyebrow="Activity" title="Recent platform activity">
            <p className="text-[13px] text-charcoal/58 leading-relaxed">
              Structured activity feeds and webhook failure details stay on the Platform home for escalations. Reach for them
              when operations needs engineering help.
            </p>
          </OpsPanel>
        )}
      </div>

      <OpsPanel
        eyebrow="Catering"
        title={operationalLens ? "Inquiry snapshots from loader" : "Catering inquiries"}
        description={
          operationalLens ?
            "Lanes map to the same database statuses as the full board; empty columns are normal early in the week."
          : "Each column is where the catering team parked the conversation—these are the same records as the inquiries list."
        }
      >
        <div className="grid gap-3 md:grid-cols-4">
          {dash.cateringKanban.map((col) => (
            <div
              key={col.id}
              className="rounded-xl border border-cream-dark/70 bg-white/80 px-3 py-3"
              title={col.laneTooltip}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-dark">{col.title}</p>
              <p className="text-[11px] text-charcoal/50 mt-1">{col.hint}</p>
              <ul className="mt-3 space-y-2">
                {col.cards.length === 0 ?
                  <li className="text-[12px] text-charcoal/50">No inquiries in this bucket yet.</li>
                : col.cards.map((c) => (
                      <li key={c.id} className="rounded-lg border border-cream-dark/60 bg-cream/[0.25]">
                        <Link
                          href={`/admin/catering-inquiries/${c.id}`}
                          title={c.statusTooltip}
                          className="block px-2.5 py-2 hover:bg-white/85 transition-colors"
                        >
                          <div className="flex justify-between gap-2 items-start">
                            <p className="text-[12px] font-semibold text-charcoal leading-snug flex-1 min-w-0">
                              {c.primaryLine}
                            </p>
                            {c.duplicateFoldCount ?
                              <span
                                className="shrink-0 rounded-full bg-charcoal/[0.08] px-1.5 py-[2px] text-[9px] font-semibold text-charcoal/55 uppercase tracking-[0.08em]"
                                title={`${c.duplicateFoldCount} rows collapsed`}
                              >
                                ×{c.duplicateFoldCount}
                              </span>
                            : null}
                          </div>
                        </Link>
                      </li>
                    ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/45 mb-2">
            {operationalLens ? "Label-pending shipments preview" : "Next shipment awaiting a label"}
          </p>
          {dash.labelBatchPreview ?
            <FulfillmentBatchRow {...dash.labelBatchPreview} />
          : (
            <p className="text-[13px] text-charcoal/58">
              {operationalLens ?
                "No label-pending shipments in the batch preview for this load."
              : "No retail shipment is queued for labeling in this snapshot."}
            </p>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-4">
          <Link
            href="/admin/catering-inquiries"
            className="text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-dark hover:underline underline-offset-4"
          >
            Catering inquiries →
          </Link>
          <Link
            href="/admin/catering-orders"
            className="text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-dark hover:underline underline-offset-4"
          >
            Catering orders board →
          </Link>
        </div>
      </OpsPanel>
    </div>
  );
}
