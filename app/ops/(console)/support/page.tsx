import Link from "next/link";
import { redirect } from "next/navigation";
import OpsPageHeader from "@/components/ops/OpsPageHeader";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatShort(isoOrDate: Date) {
  return isoOrDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function OpsSupportLandingPage() {
  const session = await getOpsSession();
  if (!session) redirect("/login?next=/ops/support");

  const rows = await prisma.operationalSupportIssue.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      status: true,
      title: true,
      summary: true,
      commerceOrderId: true,
      createdAt: true,
    },
  });

  const withOrderHref = rows.filter((r): r is typeof r & { commerceOrderId: string } => Boolean(r.commerceOrderId));

  return (
    <>
      <OpsPageHeader
        title="Operational support backlog"
        description="Live `OperationalSupportIssue` rows keyed to commerce shells — escalate from the unified order console or create contextual cases there."
        actions={
          <Link href="/ops/orders" className="text-[12px] text-[#8FC4C4] hover:underline">
            Browse orders →
          </Link>
        }
      />

      {withOrderHref.length === 0 ?
        <p className="text-[13px] text-[#c9bba8] border border-[#3d3830] rounded-lg px-3 py-4">
          No persisted issues correlated to storefront commerce orders yet — open `/ops/orders/[id]` panels to originate
          work.
        </p>
      : (
          <div className="overflow-x-auto border border-[#3d3830] rounded-xl">
            <table className="w-full text-left text-[13px] text-[#f5e5c0]">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-[#c9bba8]/80 border-b border-[#3d3830]">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3d3830]">
                {withOrderHref.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-[#c9bba8]/90">{formatShort(r.createdAt)}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2">{r.summary ? `${r.title} — ${r.summary.slice(0, 80)}` : r.title}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">
                      <Link className="text-[#8FC4C4] underline-offset-4 hover:underline" href={`/ops/orders/${r.commerceOrderId}`}>
                        {r.commerceOrderId!.slice(0, 8)}…
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  );
}
