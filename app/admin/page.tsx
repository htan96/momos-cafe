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
import {
  adminCateringKanban,
  adminDashboardActivity,
  adminOperationalAlerts,
  adminQueueSummariesHighlight,
  adminShipmentExceptions,
  adminSupportBacklogSummary,
  adminFulfillmentRows,
} from "@/lib/operations/mockAdminOps";

export default function AdminHomePage() {
  return (
    <div className="space-y-10">
      <OpsPageHeader
        title="Command center"
        subtitle="Queue-first snapshot for floor leads — mocks only until tooling wires to live workloads."
        actions={
          <Link
            href="/admin/queues"
            className="rounded-lg border border-cream-dark bg-white px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-charcoal hover:bg-cream/80 transition-colors"
          >
            Queue detail
          </Link>
        }
      />

      <OperationalAlertStrip alerts={adminOperationalAlerts} />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <OpsPanel title="Fulfillment readiness" eyebrow="Floor" description="Pack + manifest cohesion before outbound.">
          <div className="grid gap-3 sm:grid-cols-3">
            <OpsMetricQuiet label="Active slots" value="14" hint="Hot + garnish lanes" />
            <OpsMetricQuiet label="Cold chain staged" value="6" hint="Pickup window overlap" />
            <OpsMetricQuiet label="Manifest QA" value="Optional" hint="Stamp when carrier sensitive" />
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/45">Next packs</p>
            {adminFulfillmentRows.slice(0, 2).map((r) => (
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
            ))}
          </div>
        </OpsPanel>

        <OpsPanel eyebrow="Support backlog" title="Tickets" description="Inbound guest issues queued for Tier 2.">
          <p className="font-display text-4xl text-charcoal">{adminSupportBacklogSummary.open}</p>
          <p className="text-[13px] text-charcoal/60 mt-2">
            Soft SLA drift · <span className="font-semibold text-charcoal">{adminSupportBacklogSummary.overdueSoft}</span>
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
          {adminQueueSummariesHighlight.map((q) => (
            <QueueSummaryCard key={q.id} {...q} />
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OpsPanel title="Shipment exceptions" eyebrow="Carriers">
          <div className="space-y-3">
            {adminShipmentExceptions.map((e) => (
              <ShipmentExceptionRow key={e.id} {...e} />
            ))}
          </div>
        </OpsPanel>

        <WorkflowTimeline eyebrow="Live floor" title="Recent activity — mock lifecycle" steps={adminDashboardActivity} />
      </div>

      <OpsPanel title="Catering pipeline" eyebrow="Programs" description="Hold → packing — condensed strip from full board.">
        <div className="grid gap-3 md:grid-cols-4">
          {adminCateringKanban.map((col) => (
            <div key={col.id} className="rounded-xl border border-cream-dark/70 bg-white/80 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-dark">{col.title}</p>
              <p className="text-[11px] text-charcoal/50 mt-1">{col.hint}</p>
              <ul className="mt-3 space-y-2">
                {col.cards.map((c) => (
                  <li key={c.id} className="rounded-lg border border-cream-dark/60 px-2.5 py-2 bg-cream/[0.25]">
                    <p className="text-[12px] font-semibold text-charcoal leading-snug">{c.title}</p>
                    <p className="text-[11px] text-charcoal/55 mt-1">{c.pickupWindow}</p>
                    <div className="mt-2 flex justify-between items-center gap-2">
                      <span className="text-[10px] text-charcoal/45">{c.headcount}</span>
                      <OpsStatusPill variant={c.variant} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/45 mb-2">Batch handoff</p>
          <FulfillmentBatchRow
            id="B-004"
            orders={7}
            skuMix="Retail USPS batch"
            station="Label desk"
            queuedAt="12:06 PT"
            variant="awaiting_label"
          />
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
