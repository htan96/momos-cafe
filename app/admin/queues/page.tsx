import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import QueueSummaryCard from "@/components/operations/QueueSummaryCard";
import { adminQueueSummariesAll } from "@/lib/operations/mockAdminOps";

export default function AdminQueuesPage() {
  return (
    <div className="space-y-10">
      <OpsPanel className="bg-gradient-to-br from-cream/90 via-white/[0.95] to-cream/[0.75] border-cream-dark/70">
        <div className="max-w-[56ch]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-dark">Queue operations</p>
          <h1 className="font-display text-3xl text-charcoal tracking-tight mt-2">
            Operational depth map
          </h1>
          <p className="text-[15px] text-charcoal/72 mt-3 leading-relaxed">
            Packing, outbound labels, catering, support, refunds, shipment exceptions, and comms threads — summarized with mock assignee pools.
          </p>
        </div>
      </OpsPanel>

      <OpsPageHeader
        eyebrow={false}
        title="Detailed lane cards"
        subtitle="Assignments are placeholders until routing binds to IAM roles and escalation timers."
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {adminQueueSummariesAll.map((q) => (
          <QueueSummaryCard key={q.id} {...q} />
        ))}
      </div>
    </div>
  );
}
