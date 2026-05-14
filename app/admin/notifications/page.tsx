import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import { adminNotificationBuckets } from "@/lib/operations/mockAdminOps";

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-8">
      <OpsPageHeader title="Operational notifications" subtitle="Staff alerting surface — categorized mock feed with workflow visibility." />

      <div className="space-y-6">
        {adminNotificationBuckets.map((bucket) => (
          <OpsPanel key={bucket.category} title={bucket.category} eyebrow="Category">
            <ul className="divide-y divide-cream-dark/50">
              {bucket.items.map((n) => (
                <li key={n.id} className="py-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-charcoal">{n.title}</p>
                    <p className="text-[13px] text-charcoal/65 mt-1 leading-relaxed">{n.preview}</p>
                    <p className="text-[11px] font-mono text-charcoal/45 mt-2">Workflow · {n.workflowId}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <OpsStatusPill variant={n.variant} />
                    <span className="text-[11px] text-charcoal/45">{n.at}</span>
                  </div>
                </li>
              ))}
            </ul>
          </OpsPanel>
        ))}
      </div>
    </div>
  );
}
