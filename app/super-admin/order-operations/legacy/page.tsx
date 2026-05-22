import Link from "next/link";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill from "@/components/governance/StatusPill";
import type { CafeOrderStatus } from "@/types/order";
import { queryLegacyCafeOrders } from "@/lib/orders/queryLegacyCafeOrders";
import { readCafeOrderCustomerEmail } from "@/lib/orders/cafeOrderCustomerJson";

export const dynamic = "force-dynamic";

const LEGACY_CAFE_ORDER_STATUSES: CafeOrderStatus[] = [
  "scheduled",
  "awaiting_payment",
  "confirmed",
  "paid",
  "payment_failed",
];

export default async function SuperAdminLegacyCafeOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; page?: string; take?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const q = typeof sp.q === "string" ? sp.q : "";
  const statusRaw = typeof sp.status === "string" ? sp.status.trim() : "";
  const status =
    statusRaw && (LEGACY_CAFE_ORDER_STATUSES as readonly string[]).includes(statusRaw) ?
      statusRaw
    : undefined;
  const page = typeof sp.page === "string" && /^\d+$/.test(sp.page) ? Number(sp.page) : 1;
  const takeParsed = typeof sp.take === "string" && /^\d+$/.test(sp.take) ? Number(sp.take) : undefined;

  const result = await queryLegacyCafeOrders({
    search: q,
    status,
    page,
    take: takeParsed,
  });

  const pages = Math.max(1, Math.ceil(result.total / result.take));

  function pageHref(target: number) {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (q.trim()) p.set("q", q.trim());
    p.set("page", String(target));
    p.set("take", String(result.take));
    const qs = p.toString();
    return qs.length ? `/super-admin/order-operations/legacy?${qs}` : "/super-admin/order-operations/legacy";
  }

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Kitchen · Checkout"
        title="Legacy cafe orders"
        subtitle="Historical `cafe_orders` snapshots (kitchen / Square-assisted guest checkout until unified commerce fully absorbs the path)."
        actions={
          <Link
            href="/super-admin/order-operations"
            className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
          >
            Unified order operations
          </Link>
        }
      />

      <OperationalCard
        title="Search & paging"
        meta={`${result.take} rows · Page ${Math.min(page, pages)} / ${pages}`}
      >
        <form method="get" className="flex flex-wrap items-end gap-3 mb-6 text-[13px]">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Status</span>
            <select
              name="status"
              defaultValue={status ?? ""}
              className="rounded-lg border border-cream-dark/70 bg-white px-3 py-2 min-w-[10rem]"
            >
              <option value="">Any</option>
              {LEGACY_CAFE_ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 min-w-[16rem] flex-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">
              café_order UUID or email substring
            </span>
            <input name="q" defaultValue={q} className="rounded-lg border border-cream-dark/70 px-3 py-2 font-mono text-[12px]" />
          </label>
          <label className="flex flex-col gap-1 w-[6rem]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">take</span>
            <input
              type="number"
              name="take"
              defaultValue={String(result.take)}
              min={1}
              max={100}
              className="rounded-lg border border-cream-dark/70 px-3 py-2 text-[13px]"
            />
          </label>
          <input type="hidden" name="page" value="1" />
          <button
            type="submit"
            className="rounded-lg border border-teal/35 bg-teal/[0.1] px-4 py-2 text-[12px] font-semibold text-teal-dark hover:bg-teal/[0.16]"
          >
            Apply
          </button>
        </form>

        {result.rows.length === 0 ?
          <p className="text-[13px] text-charcoal/60">No `cafe_orders` rows matched.</p>
        : <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
            <table className="w-full min-w-[62rem] text-left text-[13px]">
              <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                <tr>
                  <th className="px-3 py-2">Order id</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Paid?</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/40">
                {result.rows.map((row) => {
                  const email = readCafeOrderCustomerEmail(row.customer);
                  return (
                    <tr key={row.id}>
                      <td className="px-3 py-2">
                        <Link
                          href={`/super-admin/order-operations/legacy/${row.id}`}
                          className="font-mono text-[12px] text-teal-dark hover:underline"
                          title={row.id}
                        >
                          {`${row.id.slice(0, 8)}…`}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill variant="neutral">{row.status}</StatusPill>
                      </td>
                      <td className="px-3 py-2">{row.isPaid ? "paid" : "unpaid"}</td>
                      <td className="px-3 py-2 font-mono text-[12px]">{email ?? "—"}</td>
                      <td className="px-3 py-2 font-medium text-right">${(row.totalCents / 100).toFixed(2)}</td>
                      <td className="px-3 py-2 text-[12px] text-charcoal/60">
                        {row.createdAt.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        }

        <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] font-semibold text-teal-dark">
          {page > 1 ?
            <Link href={pageHref(Math.max(1, page - 1))} className="underline-offset-2 hover:underline">
              Previous
            </Link>
          : null}
          {page < pages ?
            <Link href={pageHref(page + 1)} className="underline-offset-2 hover:underline">
              Next page
            </Link>
          : null}
        </div>
      </OperationalCard>
    </div>
  );
}
