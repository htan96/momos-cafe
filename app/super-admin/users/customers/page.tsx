import Link from "next/link";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StartCustomerImpersonation from "@/components/governance/StartCustomerImpersonation";
import StatusPill from "@/components/governance/StatusPill";
import {
  CUSTOMER_DIRECTORY_STALE_DAYS,
  querySuperAdminCustomerDirectory,
} from "@/lib/accountManagement/querySuperAdminCustomerDirectory";
import { displayNameFromAuth } from "@/lib/accountManagement/accountsBrowse";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function qpSingle(v: string | string[] | undefined): string {
  return Array.isArray(v) ? String(v[0] ?? "").trim() : String(v ?? "").trim();
}

export default async function SuperAdminUsersCustomersPage(props: PageProps) {
  const raw = await props.searchParams;
  const q = qpSingle(raw.q).slice(0, 220);
  const page = parseInt(qpSingle(raw.page) || "1", 10);
  const pageSize = parseInt(qpSingle(raw.pageSize) || "", 10);
  const orders = qpSingle(raw.orders);
  const activity = qpSingle(raw.activity);

  const result = await querySuperAdminCustomerDirectory({
    q: q || undefined,
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : undefined,
    orders,
    activity,
  });

  const qsBase = (): URLSearchParams => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (orders) p.set("orders", orders);
    if (activity) p.set("activity", activity);
    return p;
  };

  function hrefWith(extra: Record<string, string | undefined>): string {
    const p = qsBase();
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined || v === "") p.delete(k);
      else p.set(k, v);
    }
    const suffix = p.toString();
    return suffix ? `/super-admin/users/customers?${suffix}` : "/super-admin/users/customers";
  }

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Users · Customers"
        title="Customer directory"
        subtitle={`Search Prisma diners by email substring or UUID, paginate, and skim commerce counts plus grounded failure/incident cues. No synthetic scoring · stale toggle keys off commerce order freshness (${CUSTOMER_DIRECTORY_STALE_DAYS}d) only.`}
        actions={
          <Link
            href="/super-admin/customer-operations"
            className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
          >
            Legacy roster
          </Link>
        }
      />

      <OperationalCard title="Customer-scope impersonation" meta="TTL 8h · governance reason required">
        <p className="text-[13px] text-charcoal/65 leading-relaxed mb-1">
          HttpOnly impersonation envelope + audited ledger (`ImpersonationSupportSession`). Enter target email plus a
          short justification referencing the incident or ticket narrative.
        </p>
        <StartCustomerImpersonation />
      </OperationalCard>

      <OperationalCard title="Directory roster" meta="GET · customers + badges">
        <form method="GET" action="/super-admin/users/customers" className="space-y-4">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">
            Email contains or customer UUID
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="alice@momos.place or UUID"
              className="flex-1 min-w-[220px] rounded-lg border border-cream-dark bg-white px-4 py-2 text-[13px]"
            />
            {orders ?
              <input type="hidden" name="orders" value={orders} />
            : null}
            {activity ?
              <input type="hidden" name="activity" value={activity} />
            : null}
            <button
              type="submit"
              className="rounded-lg bg-teal-dark px-5 py-2 text-[13px] font-semibold text-cream hover:opacity-95"
            >
              Search
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 w-full mb-1">
              Orders filter
            </span>
            {(
              [
                ["", "Any"],
                ["has_orders", "Has orders"],
                ["no_orders", "No orders"],
              ] as const
            ).map(([val, label]) => (
              <Link
                key={val || "any"}
                href={hrefWith({ orders: val, activity, page: "" })}
                scroll={false}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  orders === val
                    ? "border-teal-dark/70 bg-teal/[0.12] text-teal-dark"
                    : "border-cream-dark bg-white text-charcoal/65"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 w-full mb-1">
              Activity / freshness
            </span>
            {(
              [
                ["", "Any freshness"],
                ["stale", `Stale (${CUSTOMER_DIRECTORY_STALE_DAYS}d commerce signal)`],
              ] as const
            ).map(([val, label]) => (
              <Link
                key={val || "any-act"}
                href={hrefWith({ activity: val, orders, page: "" })}
                scroll={false}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  activity === val
                    ? "border-teal-dark/70 bg-teal/[0.12] text-teal-dark"
                    : "border-cream-dark bg-white text-charcoal/65"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </form>

        {result.total === 0 ?
          <p className="mt-6 text-[13px] text-charcoal/60 leading-relaxed">No diners matched filters.</p>
        : (
          <>
            <p className="mt-6 text-[12px] text-charcoal/55">
              {`Showing ${result.items.length.toString()} · page ${result.page.toString()} of ${Math.max(
                1,
                Math.ceil(result.total / result.pageSize)
              )}`}
              {` (${result.total} total)`}
            </p>

            <div className="mt-4 overflow-x-auto rounded-lg border border-cream-dark/50">
              <table className="w-full min-w-[62rem] text-left text-[12px]">
                <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[10px] uppercase tracking-[0.08em] text-charcoal/50">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Customer</th>
                    <th className="px-2 py-2 font-semibold">Identity</th>
                    <th className="px-2 py-2 font-semibold">Orders</th>
                    <th className="px-2 py-2 font-semibold">Signals</th>
                    <th className="px-2 py-2 font-semibold">Profile updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark/40">
                  {result.items.map((row) => {
                    const name = displayNameFromAuth(row.authMetadata);
                    const dossierHref = `/super-admin/users/customers/${row.id}`;
                    return (
                      <tr key={row.id} className="bg-white/80 align-top">
                        <td className="px-2 py-2">
                          <Link href={dossierHref} className="font-mono text-teal-dark hover:underline">
                            {row.id.slice(0, 8)}…
                          </Link>
                          {row.externalAuthSubject ?
                            <span className="block font-mono text-[10px] text-charcoal/45 break-all">
                              {row.externalAuthSubject.slice(0, 12)}…
                            </span>
                          : (
                            <span className="block text-[10px] text-charcoal/40">No Cognito sub</span>
                          )}
                        </td>
                        <td className="px-2 py-2 space-y-1">
                          <div className="text-[13px] font-semibold">{name ?? "—"}</div>
                          <div className="text-[11px] break-all">{row.email ?? "No email"}</div>
                          <div>{row.phone?.trim() || "—"}</div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <StatusPill variant={row.orderCount > 0 ? "ok" : "neutral"}>{row.orderCount}</StatusPill>
                          {row.lastOrderUpdatedAt ?
                            <span className="block text-[10px] text-charcoal/45 mt-1">
                              last orderΔ{" "}
                              {row.lastOrderUpdatedAt.toLocaleString(undefined, {
                                dateStyle: "medium",
                              })}
                            </span>
                          : null}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-wrap gap-1">
                            {row.failedPaymentCount > 0 ?
                              <StatusPill variant="degraded">{`${row.failedPaymentCount} · payment_failed`}</StatusPill>
                            : (
                              <StatusPill variant="neutral">payments clean</StatusPill>
                            )}
                            {row.openIncidentCount > 0 ?
                              <StatusPill variant="warning">{`${row.openIncidentCount} open incident`}</StatusPill>
                            : null}
                            {row.orphanWebhookHint ?
                              <StatusPill variant="degraded">orphan webhook*</StatusPill>
                            : null}
                            {row.draftPaymentIssueCount > 0 ?
                              <StatusPill variant="warning">{`draft w/ failures · latest order`}</StatusPill>
                            : null}
                          </div>
                          <p className="text-[9px] text-charcoal/40 mt-1">
                            *Bounded scan over recent `payment.square.orphan_webhook` rows with customer id metadata.
                          </p>
                          <Link
                            href={`/super-admin/operations/failures?customerId=${encodeURIComponent(row.id)}`}
                            className="mt-2 inline-block text-teal-dark text-[11px] font-semibold hover:underline"
                          >
                            Open failures inbox
                          </Link>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-charcoal/65">
                          {row.updatedAt.toLocaleString(undefined, {
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

            {result.total > result.pageSize ?
              <div className="mt-4 flex flex-wrap gap-2">
                {result.page <= 1 ?
                  <span className="rounded-lg border border-cream-dark/50 px-3 py-1.5 text-[12px] text-charcoal/45">
                    Previous
                  </span>
                : (
                  <Link
                    href={hrefWith({
                      page: result.page <= 2 ? "" : String(result.page - 1),
                      orders,
                      activity,
                    })}
                    className="rounded-lg border border-cream-dark/70 px-3 py-1.5 text-[12px] font-semibold hover:bg-cream-mid/30"
                  >
                    Previous
                  </Link>
                )}
                {result.page * result.pageSize >= result.total ?
                  <span className="rounded-lg border border-cream-dark/50 px-3 py-1.5 text-[12px] text-charcoal/45">
                    Next
                  </span>
                : (
                  <Link
                    href={hrefWith({ page: String(result.page + 1), orders, activity })}
                    className="rounded-lg border border-cream-dark/70 px-3 py-1.5 text-[12px] font-semibold hover:bg-cream-mid/30"
                  >
                    Next
                  </Link>
                )}
              </div>
            : null}
          </>
        )}
      </OperationalCard>
    </div>
  );
}
