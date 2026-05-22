import Link from "next/link";

import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import StateToneChip from "@/components/operations/StateToneChip";
import OrdersSuperAdminTechnicalPanel from "@/components/admin/orders/OrdersSuperAdminTechnicalPanel";
import {
  ADMIN_COMMERCE_ORDERS_DEFAULT_PAGE_SIZE,
  type AdminCommerceOrdersIndexRow,
  type AdminCommerceOrdersIndexPayload,
} from "@/lib/admin/loadAdminCommerceOrdersIndex";

function formatStaffDate(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortenOrderId(id: string): string {
  return `${id.slice(0, 8)}…`;
}

/** Plain-language tooltip for placement window + staff filters (no webhook / DB jargon on the surfaced label). */
const PERIOD_HELP =
  "List is limited to orders placed within the calendar window you chose. Staff view also requires orders to be paid, ready for fulfillment, and set up with at least one fulfillment path. Widening the period or switching to an operational overlay (when available to you) can show additional rows.";

export default function AdminCommerceOrdersView(props: {
  showSuperAdminOperationalLens: boolean;
  bundle: AdminCommerceOrdersIndexPayload;
}) {
  const { bundle, showSuperAdminOperationalLens } = props;
  const { rows, totalMatching, page, pageSize, windowDays, windowStartsAtUtc } = bundle;

  const from = totalMatching > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = totalMatching > 0 ? Math.min(page * pageSize, totalMatching) : 0;
  const lastPage = Math.max(1, Math.ceil(totalMatching / pageSize));
  const canPrev = page > 1;
  const canNext = page < lastPage;

  const buildHref = (nextPage: number) => {
    const p = new URLSearchParams();
    p.set("days", String(windowDays));
    if (nextPage > 1) p.set("page", String(nextPage));
    if (pageSize !== ADMIN_COMMERCE_ORDERS_DEFAULT_PAGE_SIZE) {
      p.set("pageSize", String(pageSize));
    }
    const qs = p.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  const staffSubtitle =
    showSuperAdminOperationalLens ?
      "Placement-window snapshot; your operational overlay also relaxes list filters so more lifecycle states stay visible alongside the tighter staff inbox."
    : "Paid storefront orders in your placement window that are ready for fulfillment work. Use shortcuts to open fulfillment, parcel shipping labels, or the receipt area on each order.";

  return (
    <div className="space-y-8">
      <OpsPageHeader title="Orders" subtitle={staffSubtitle} />

      <OpsPanel title="Browse orders" eyebrow={`Placement · last ${windowDays} day${windowDays === 1 ? "" : "s"} (UTC)`}>
        <p className="text-[13px] text-charcoal/72 leading-relaxed">
          Showing{" "}
          <span className="font-semibold text-charcoal">
            {totalMatching === 0 ? "0" : `${from}–${to}`} of {totalMatching}
          </span>{" "}
          order{totalMatching === 1 ? "" : "s"}
          {" · "}
          <span tabIndex={0} role="img" aria-label={PERIOD_HELP} title={PERIOD_HELP} className="cursor-help border-b border-dotted border-charcoal/35">
            orders placed from {windowStartsAtUtc.toLocaleDateString(undefined, { dateStyle: "medium" })}
          </span>
          <span className="text-charcoal/45"> onward (UTC).</span>
        </p>

        <form method="get" action="/admin/orders" className="mt-4 flex flex-wrap items-end gap-3 text-[13px]">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">
              Placement window · days back
              <span
                tabIndex={0}
                role="img"
                className="ml-1 cursor-help rounded-full border border-cream-dark/80 bg-cream/50 px-[6px] text-[10px] text-charcoal/50 outline-offset-2"
                title={PERIOD_HELP}
                aria-label={PERIOD_HELP}
              >
                i
              </span>
            </span>
            <input type="hidden" name="page" value="1" />
            <select name="days" defaultValue={String(windowDays)} className="rounded-lg border border-cream-dark/70 bg-white px-3 py-2 min-w-[8rem]">
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
              <option value="45">Last 45 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 180 days</option>
              <option value="366">Last 12 months</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg border border-teal-dark/45 bg-teal/[0.12] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-teal-dark hover:bg-teal/20 transition-colors"
          >
            Apply
          </button>
        </form>
      </OpsPanel>

      {showSuperAdminOperationalLens ?
        <OrdersSuperAdminTechnicalPanel bundle={bundle} />
      : null}

      {rows.length === 0 ?
        <div className="text-center rounded-xl border border-dashed border-charcoal/[0.12] bg-cream/40 py-14 px-6 space-y-3">
          <p className="text-[14px] font-semibold text-charcoal tracking-tight">No commerce orders available for this period.</p>
          <p className="text-[13px] text-charcoal/60 max-w-md mx-auto" title={PERIOD_HELP}>
            Adjust the placement window above, or confirm whether the orders you expect were paid and set up for fulfillment. Rows outside
            this window—or still in checkout—stay hidden here on purpose so the list stays actionable.
          </p>
          <span
            tabIndex={0}
            role="img"
            className="inline-flex cursor-help text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 border-b border-dotted border-charcoal/30 outline-offset-2"
            aria-label={PERIOD_HELP}
            title={PERIOD_HELP}
          >
            Why filters matter
          </span>
        </div>
      : (
        <div className="overflow-x-auto rounded-xl border border-cream-dark/70 bg-white/90 shadow-[0_1px_2px_rgb(41_53_61/0.04)]">
          <table className="min-w-[720px] w-full text-left text-[13px]">
            <thead className="border-b border-cream-dark/80 bg-cream-mid/20 text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/50">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Order</th>
                <th className="px-4 py-3 min-w-[10rem]">Customer</th>
                <th className="px-4 py-3 whitespace-nowrap">Last update</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Shortcuts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <AdminOrderTableRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>

          <div className="flex flex-wrap justify-between gap-3 items-center border-t border-cream-dark/60 px-4 py-3 text-[13px] text-charcoal/70">
            <span>
              Page {page} of {lastPage}
            </span>
            <div className="flex gap-2">
              {canPrev ?
                <Link
                  prefetch={false}
                  href={buildHref(page - 1)}
                  className="rounded-lg border border-cream-dark bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 uppercase tracking-[0.1em] hover:bg-cream/80 transition-colors"
                >
                  Previous
                </Link>
              : (
                <span className="rounded-lg border border-transparent px-3 py-1.5 text-[12px] text-charcoal/35 uppercase tracking-[0.1em]">
                  Previous
                </span>
              )}
              {canNext ?
                <Link
                  prefetch={false}
                  href={buildHref(page + 1)}
                  className="rounded-lg border border-cream-dark bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 uppercase tracking-[0.1em] hover:bg-cream/80 transition-colors"
                >
                  Next
                </Link>
              : (
                <span className="rounded-lg border border-transparent px-3 py-1.5 text-[12px] text-charcoal/35 uppercase tracking-[0.1em]">
                  Next
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminOrderTableRow({ row }: { row: AdminCommerceOrdersIndexRow }) {
  const pipelines = row.fulfillmentPipelines.join(" · ") || "—";

  return (
    <tr className="border-b border-cream-dark/55 last:border-0 hover:bg-cream/[0.25] transition-colors align-top">
      <td className="px-4 py-3">
        <div className="space-y-1">
          <Link href={`/admin/orders/${row.id}`} className="font-semibold text-teal-dark hover:underline underline-offset-2">
            {shortenOrderId(row.id)}
          </Link>
          <div className="text-[11px] text-charcoal/45">{row.fulfillmentGroupCount} fulfillment path{row.fulfillmentGroupCount === 1 ? "" : "s"}</div>
        </div>
      </td>
      <td className="px-4 py-3 text-charcoal/85 break-words max-w-[16rem]">{row.clientLabel}</td>
      <td className="px-4 py-3 whitespace-nowrap text-charcoal/80">
        <time dateTime={row.updatedAt.toISOString()}>{formatStaffDate(row.updatedAt)}</time>
        <div className="text-[11px] text-charcoal/42 mt-1">Placed {formatStaffDate(row.createdAt)}</div>
      </td>
      <td className="px-4 py-3 space-y-1.5">
        <StateToneChip label={row.status} tone="neutral" />
        <div className="text-[11px] uppercase tracking-[0.08em] text-charcoal/45">{pipelines}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1.5 min-w-[8rem]">
          <ShortcutLink href={`/admin/orders/${row.id}#staff-order-fulfillment-nucleus`} label="Fulfillment workspace" emphasized />
          <ShortcutLink href="/admin/fulfillment" label="Fulfillment floor" />
          <ShortcutLink href="/admin/shipping" label="Shipping & labels" />
          <ShortcutLink href={`/admin/orders/${row.id}#staff-order-receipt-payments`} label="Receipt & payments" />
        </div>
      </td>
    </tr>
  );
}

function ShortcutLink(props: { href: string; label: string; emphasized?: boolean }) {
  return (
    <Link
      href={props.href}
      className={`text-[12px] hover:underline underline-offset-2 ${props.emphasized ? "font-semibold text-teal-dark" : "font-medium text-teal-dark/90"}`}
    >
      {props.label}
    </Link>
  );
}
