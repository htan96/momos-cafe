import Link from "next/link";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import type { OpsStatusVariant } from "@/components/operations/OpsStatusPill";
import { buildAccountMgmtList } from "@/lib/accountManagement/accountsBrowse";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";

function rolePillVariant(role: string): OpsStatusVariant {
  switch (role) {
    case "super_admin":
      return "denied";
    case "admin":
      return "open";
    default:
      return "muted";
  }
}

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pickFlag(v: string | string[] | undefined): boolean {
  if (Array.isArray(v)) return v[0] === "1";
  return v === "1";
}

function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]?.trim() || undefined;
  return v?.trim() || undefined;
}

export default async function AdminAccountsPage(props: { searchParams?: Promise<SearchParams> }) {
  const sp = (await props.searchParams) ?? {};
  const q = pickString(sp.q);
  const customersOnly = pickFlag(sp.customers_only);
  const adminsOnly = pickFlag(sp.admins_only);
  const recentSignup = pickFlag(sp.recent);
  const activeUsers = pickFlag(sp.active);
  const failedPayments = pickFlag(sp.failed_payments);

  const cfg = getCognitoConfig();
  const viewer = await getCognitoServerSession();
  const viewerSuper = Boolean(viewer?.groups && isSuperAdmin(viewer.groups));

  const { rows, cognitoUnavailable } = await buildAccountMgmtList(cfg, {
    q,
    customersOnly,
    adminsOnly,
    recentSignup,
    activeUsers,
    failedPayments,
  });

  const buildHref = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (customersOnly) p.set("customers_only", "1");
    if (adminsOnly) p.set("admins_only", "1");
    if (recentSignup) p.set("recent", "1");
    if (activeUsers) p.set("active", "1");
    if (failedPayments) p.set("failed_payments", "1");
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined) p.delete(k);
      else p.set(k, v);
    }
    const qs = p.toString();
    return qs ? `/admin/accounts?${qs}` : "/admin/accounts";
  };

  return (
    <div className="space-y-8">
      <OpsPageHeader
        eyebrow={false}
        title="Accounts"
        subtitle={
          viewerSuper ?
            "Search storefront customers plus Cognito operators. Role edits remain on operator detail · super-admin only."
          : "Search storefront customers and operators. Sensitive membership changes route through super admins."
        }
        actions={
          <Link
            href="/super-admin/audit"
            className="rounded-lg border border-cream-dark bg-white px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-charcoal hover:bg-cream/80 transition-colors"
          >
            Governance audit
          </Link>
        }
      />

      <OpsPanel title="Filters & search" eyebrow="Operational" description="Thin queries — pragmatic filters for queues.">
        <form method="GET" action="/admin/accounts" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/45">
                Name / email / phone
              </span>
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Starts contains…"
                className="rounded-lg border border-cream-dark px-3 py-2 text-[14px] text-charcoal"
              />
            </label>
            <button
              type="submit"
              className="self-end rounded-lg bg-teal-dark px-4 py-2 text-[13px] font-semibold text-cream hover:opacity-95"
            >
              Search
            </button>
          </div>

          <div className="flex flex-wrap gap-4 text-[13px] text-charcoal/80">
            <FilterToggle
              checked={customersOnly}
              label="Customers only"
              href={buildHref({
                customers_only: customersOnly ? undefined : "1",
                admins_only: undefined,
              })}
            />
            <FilterToggle
              checked={adminsOnly}
              label="Operators only"
              href={buildHref({
                admins_only: adminsOnly ? undefined : "1",
                customers_only: undefined,
              })}
            />
            <FilterToggle
              checked={recentSignup}
              label="Recent signups (14d)"
              href={buildHref({ recent: recentSignup ? undefined : "1" })}
            />
            <FilterToggle
              checked={activeUsers}
              label="Active now (~15m)"
              href={buildHref({ active: activeUsers ? undefined : "1" })}
            />
            <FilterToggle
              checked={failedPayments}
              label="Failed payments / payment_failed"
              href={buildHref({ failed_payments: failedPayments ? undefined : "1" })}
            />
          </div>
        </form>
      </OpsPanel>

      {cognitoUnavailable ? (
        <p className="text-[13px] text-red font-medium">
          Cognito env is not configured — operator roster is unavailable. Customer rows still list from Postgres.
        </p>
      ) : null}

      <OpsPanel
        title="Directory"
        eyebrow="Results"
        description={`${rows.length} row(s) · role pill encodes platform access.`}
      >
        {rows.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No accounts match the current filters.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-cream-dark/60">
            <table className="w-full min-w-[56rem] text-left text-[13px]">
              <thead className="border-b border-cream-dark/50 bg-cream-mid/15 text-[10px] uppercase tracking-[0.12em] text-charcoal/45">
                <tr>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Phone</th>
                  <th className="px-3 py-2 font-semibold">Role</th>
                  <th className="px-3 py-2 font-semibold">Signup</th>
                  <th className="px-3 py-2 font-semibold">Last active</th>
                  <th className="px-3 py-2 font-semibold">Orders</th>
                  <th className="px-3 py-2 font-semibold">Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/45">
                {rows.map((r) => (
                  <tr key={`${r.kind}:${r.id}`} className="bg-white/80">
                    <td className="px-3 py-2 font-semibold text-charcoal">{r.name ?? "—"}</td>
                    <td className="px-3 py-2 break-all">
                      <AccountLink row={r} />
                    </td>
                    <td className="px-3 py-2 text-charcoal/70">{r.phone ?? "—"}</td>
                    <td className="px-3 py-2">
                      <OpsStatusPill variant={rolePillVariant(r.role)}>{r.role.replace("_", " ")}</OpsStatusPill>
                    </td>
                    <td className="px-3 py-2 text-charcoal/60">
                      {r.signupAtIso ? new Date(r.signupAtIso).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-charcoal/60">
                      {r.lastActiveAtIso ? new Date(r.lastActiveAtIso).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <OpsStatusPill variant="muted">{r.orderCount}</OpsStatusPill>
                    </td>
                    <td className="px-3 py-2">
                      {r.activeSession ? (
                        <OpsStatusPill variant="in_progress">active</OpsStatusPill>
                      ) : (
                        <OpsStatusPill variant="muted">quiet</OpsStatusPill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OpsPanel>
    </div>
  );
}

function FilterToggle(args: {
  checked: boolean;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={args.href}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 ${
        args.checked ?
          "border-teal-dark/40 bg-teal/[0.08] font-semibold text-teal-dark"
        : "border-cream-dark/70 text-charcoal/70 hover:bg-cream-mid/30"
      }`}
      scroll={false}
    >
      <span className="text-[11px] font-mono">{args.checked ? "✓" : "○"}</span>
      {args.label}
    </Link>
  );
}

function AccountLink({ row }: { row: { kind: string; id: string; email: string | null } }) {
  const label = row.email?.trim() || row.id;
  const href =
    row.kind === "staff" ?
      `/admin/accounts/staff/${encodeURIComponent(row.id)}`
    : `/admin/accounts/customer/${row.id}`;
  return (
    <Link href={href} className="text-teal-dark hover:underline font-mono text-[12px]">
      {label}
    </Link>
  );
}
