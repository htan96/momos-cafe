import Link from "next/link";
import FulfillmentBatchRow from "@/components/operations/FulfillmentBatchRow";
import OperationalAlertStrip from "@/components/operations/OperationalAlertStrip";
import OpsMetricQuiet from "@/components/operations/OpsMetricQuiet";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import QueueSummaryCard from "@/components/operations/QueueSummaryCard";
import ShipmentExceptionRow from "@/components/operations/ShipmentExceptionRow";
import WorkflowTimeline from "@/components/operations/WorkflowTimeline";
import { loadAdminHomeDashboard } from "@/lib/admin/adminConsoleLoaders";

export default async function AdminHomePage() {
  const dash = await loadAdminHomeDashboard();
  const packDepth = dash.queueSummaries.find((q) => q.id === "q-pack")?.depth ?? 0;
  const labelDepth = dash.queueSummaries.find((q) => q.id === "q-label")?.depth ?? 0;

  return (
    <div className="space-y-10">
      <OpsPageHeader
        title="Command center"
        subtitle="Queue depths and recent operational activity from production tables — sparse data is normal when volumes are quiet."
        actions={
          <Link
            href="/admin/queues"
            className="rounded-lg border border-cream-dark bg-white px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-charcoal hover:bg-cream/80 transition-colors"
          >
            Queue detail
          </Link>
        }
      />

      <OperationalAlertStrip alerts={dash.alerts} />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <OpsPanel title="Fulfillment readiness" eyebrow="Floor" description="Pack + manifest cohesion before outbound.">
          <div className="grid gap-3 sm:grid-cols-3">
            <OpsMetricQuiet label="Open groups" value={String(packDepth)} hint="Non-terminal fulfillment on paid orders" />
            <OpsMetricQuiet label="Labels pending" value={String(labelDepth)} hint="Retail ship rows without tracking" />
            <OpsMetricQuiet label="Manifest QA" value="Optional" hint="Operational stamp — not inferred from telemetry" />
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/45">Next packs</p>
            {dash.nextPackPreview.length === 0 ? (
              <p className="text-[13px] text-charcoal/55">No open fulfillment snapshots in the current slice.</p>
            ) : (
              dash.nextPackPreview.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap justify-between gap-2 rounded-lg border border-cream-dark/65 bg-cream/[0.3] px-3 py-2 text-[13px]"
                >
                  <span className="font-semibold text-charcoal">
                    {r.orderRef}{" "}
                    <span className="font-normal text-charcoal/58">· {r.station}</span>
                  </span>
                  <OpsStatusPill variant={r.variant} />
                </div>
              ))
            )}
          </div>
        </OpsPanel>

        <OpsPanel eyebrow="Support backlog" title="Tickets" description="Inbound guest issues queued for Tier 2.">
          <p className="font-display text-4xl text-charcoal">{dash.supportSummary.open}</p>
          <p className="text-[13px] text-charcoal/60 mt-2">
            Oldest open · <span className="font-semibold text-charcoal">{dash.supportSummary.oldestWaiting}</span>
          </p>
          <Link
            href="/admin/support"
            className="inline-block mt-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-dark hover:underline underline-offset-4"
          >
            Open inbox →
          </Link>
        </OpsPanel>
      </div>

      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-charcoal/45 mb-4">Queue summaries</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {dash.queueHighlight.map((q) => (
            <QueueSummaryCard key={q.id} {...q} />
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OpsPanel title="Shipment exceptions" eyebrow="Carriers">
          <div className="space-y-3">
            {dash.shipmentExceptions.length === 0 ? (
              <p className="text-[13px] text-charcoal/58">No shipments in exception or return-initiated statuses.</p>
            ) : (
              dash.shipmentExceptions.map((e) => <ShipmentExceptionRow key={e.id} {...e} />)
            )}
          </div>
        </OpsPanel>

        <WorkflowTimeline
          eyebrow="Live floor"
          title="Recent activity"
          steps={
            dash.activitySteps.length
              ? dash.activitySteps
              : [
                  {
                    id: "empty",
                    label: "No rows yet",
                    meta: "`OperationalActivityEvent` will populate as workloads emit telemetry.",
                    at: "—",
                    variant: "muted",
                  },
                ]
          }
        />
      </div>

      <OpsPanel title="Catering pipeline" eyebrow="Programs" description="Grouped by CateringInquiryStatus from Prisma.">
        <div className="grid gap-3 md:grid-cols-4">
          {dash.cateringKanban.map((col) => (
            <div key={col.id} className="rounded-xl border border-cream-dark/70 bg-white/80 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-dark">{col.title}</p>
              <p className="text-[11px] text-charcoal/50 mt-1">{col.hint}</p>
              <ul className="mt-3 space-y-2">
                {col.cards.length === 0 ? (
                  <li className="text-[12px] text-charcoal/50 italic">Empty lane</li>
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/45 mb-2">Batch handoff</p>
          {dash.labelBatchPreview ? (
            <FulfillmentBatchRow {...dash.labelBatchPreview} />
          ) : (
            <p className="text-[13px] text-charcoal/58">No label-pending shipments in the current preview window.</p>
          )}
        </div>
        <Link
          href="/admin/catering-orders"
          className="inline-block mt-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-dark hover:underline underline-offset-4"
        >
          Full catering board →
        </Link>
      </OpsPanel>
    </div>
  );
}
