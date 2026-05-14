import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import { adminRefundCases } from "@/lib/operations/mockAdminOps";

export default function AdminRefundsPage() {
  return (
    <div className="space-y-8">
      <OpsPageHeader title="Refunds workspace" subtitle="Finance-adjacent review queue — mocks for states and narration only." />

      <OpsPanel title="Refund cases">
        <ul className="divide-y divide-cream-dark/50">
          {adminRefundCases.map((r) => (
            <li key={r.id} className="py-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-charcoal">
                  {r.orderRef}{" "}
                  <span className="font-normal text-charcoal/58">· {r.openedAt}</span>
                </p>
                <p className="text-[13px] text-teal-dark/85 mt-1">{r.amount}</p>
                <p className="text-[13px] text-charcoal/68 mt-2 leading-relaxed">{r.reason}</p>
              </div>
              <OpsStatusPill variant={r.variant} />
            </li>
          ))}
        </ul>
      </OpsPanel>
    </div>
  );
}
