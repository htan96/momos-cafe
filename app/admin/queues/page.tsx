import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import QueueSummaryCard from "@/components/operations/QueueSummaryCard";
import { loadAdminQueueSummaries } from "@/lib/admin/adminConsoleLoaders";

export default async function AdminQueuesPage() {
  const queues = await loadAdminQueueSummaries();
  return (
    <div className="space-y-10">
      <OpsPanel className="bg-gradient-to-br from-cream/90 via-white/[0.95] to-cream/[0.75] border-cream-dark/70">
        <div className="max-w-[56ch]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-dark">Queue operations</p>
          <h1 className="font-display text-3xl text-charcoal tracking-tight mt-2">
            Operational depth map
          </h1>
          <p className="text-[15px] text-charcoal/72 mt-3 leading-relaxed">
            Depth counts and coarse age hints derive from FulfillmentGroup, Shipment, CateringInquiry,
            OperationalSupportIssue, OperationalRefundCase, and failed EmailMessage rows.
          </p>
        </div>
      </OpsPanel>

      <OpsPageHeader
        eyebrow={false}
        title="Detailed lane cards"
        subtitle="No synthetic SLA attainment — descriptive hints only."
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {queues.map((q) => (
          <QueueSummaryCard key={q.id} {...q} />
        ))}
      </div>
    </div>
  );
}
