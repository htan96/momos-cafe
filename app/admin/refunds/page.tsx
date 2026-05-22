import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import { loadAdminRefundCases, refundStatusVariant } from "@/lib/admin/adminConsoleLoaders";

function shortenId(uuid: string, head = 8): string {
  const s = uuid.replace(/-/g, "");
  return s.slice(0, Math.min(head, s.length)).toUpperCase();
}

function centsLabel(amountCents: number | null): string {
  if (amountCents == null) return "Amount · —";
  return `$${(amountCents / 100).toFixed(2)}`;
}

export default async function AdminRefundsPage() {
  const cases = await loadAdminRefundCases(40);

  return (
    <div className="space-y-8">
      <OpsPageHeader
        title="Refunds workspace"
        subtitle="OperationalRefundCase snapshots — payout authority stays in Square."
      />

      <OpsPanel title="Refund cases">
        {cases.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No coordinated refund shells yet.</p>
        ) : (
          <ul className="divide-y divide-cream-dark/50">
            {cases.map((r) => (
              <li key={r.id} className="py-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-charcoal">
                    Order · {shortenId(r.commerceOrder.id)}{" "}
                    <span className="font-normal text-charcoal/58">
                      · {new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </p>
                  <p className="text-[13px] text-teal-dark/85 mt-1">{centsLabel(r.amountCents)}</p>
                  <p className="text-[13px] text-charcoal/68 mt-2 leading-relaxed">{r.reason}</p>
                </div>
                <OpsStatusPill variant={refundStatusVariant(r.status)} />
              </li>
            ))}
          </ul>
        )}
      </OpsPanel>
    </div>
  );
}
