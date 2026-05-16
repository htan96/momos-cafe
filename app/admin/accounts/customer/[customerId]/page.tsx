import Link from "next/link";
import { notFound } from "next/navigation";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import StartCustomerImpersonation from "@/components/governance/StartCustomerImpersonation";
import { isValidCustomerUuid, loadAccountMgmtCustomerDetail } from "@/lib/accountManagement/loadAccountMgmtDetail";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";

export const dynamic = "force-dynamic";

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

type PageProps = { params: Promise<{ customerId: string }> };

export default async function AdminAccountCustomerDetailPage(props: PageProps) {
  const { customerId } = await props.params;
  if (!isValidCustomerUuid(customerId)) notFound();

  const viewer = await getCognitoServerSession();
  const viewerSuper = Boolean(viewer?.groups && isSuperAdmin(viewer.groups));

  const detail = await loadAccountMgmtCustomerDetail(customerId);
  if (!detail) notFound();

  const { customer, orders, presenceSessions, activityEvents, impersonationLedger, cateringInquiries, governanceRows } =
    detail;

  return (
    <div className="space-y-8">
      <OpsPageHeader
        eyebrow={false}
        title="Customer account"
        subtitle="Support-oriented snapshot — Postgres `Customer`, commerce footprint, governance signals."
        actions={
          <Link
            href="/admin/accounts"
            className="rounded-lg border border-cream-dark px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-charcoal hover:bg-cream-mid/40"
          >
            ← Accounts
          </Link>
        }
      />

      <OpsPanel title="Profile" eyebrow="Identity">
        <dl className="grid gap-3 sm:grid-cols-2 text-[13px] text-charcoal/80">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Display name</dt>
            <dd className="mt-1 text-charcoal">{detail.profile.displayName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Role</dt>
            <dd className="mt-1">
              <OpsStatusPill variant="muted">customer</OpsStatusPill>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Email</dt>
            <dd className="mt-1 break-all">{customer.email?.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Phone</dt>
            <dd className="mt-1">{customer.phone?.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Signup</dt>
            <dd className="mt-1">{customer.createdAt.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Cognito subject</dt>
            <dd className="mt-1 font-mono text-[12px] break-all">{customer.externalAuthSubject ?? "—"}</dd>
          </div>
        </dl>

        {viewerSuper && customer.email?.trim() ? (
          <div className="mt-6 rounded-xl border border-cream-dark/70 bg-cream/[0.15] px-4 py-3">
            <p className="text-[13px] text-charcoal/75 mb-3">
              Super-admin impersonation flows are audited; scoped to customer storefront routes.
            </p>
            <StartCustomerImpersonation prefilledEmail={customer.email} />
          </div>
        ) : null}

        {!viewerSuper ? (
          <p className="mt-4 text-[12px] text-charcoal/50">
            Operators without super-admin cannot start impersonation. Escalate for signed-in diner preview.
          </p>
        ) : null}
      </OpsPanel>

      <OpsPanel title="Order history" eyebrow="Commerce" description="Opens super-admin operational order view when permitted.">
        {orders.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No linked commerce orders yet.</p>
        ) : (
          <ul className="divide-y divide-cream-dark/50">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-mono text-[12px] text-teal-dark">
                    {viewerSuper ? (
                      <Link href={`/super-admin/order-operations/${o.id}`} className="hover:underline">
                        {o.id.slice(0, 8)}…
                      </Link>
                    ) : (
                      <span>{o.id.slice(0, 8)}…</span>
                    )}
                  </p>
                  <p className="text-[11px] text-charcoal/45">{o.createdAt.toLocaleString()} · status {o.status}</p>
                </div>
                <span className="text-[13px] font-semibold text-charcoal">{formatUsd(o.totalCents)}</span>
              </li>
            ))}
          </ul>
        )}
        {!viewerSuper && orders.length > 0 ?
          <p className="mt-3 text-[12px] text-charcoal/50">
            Paste the full order id into super-admin Order operations — admin route deep links aren&apos;t wired yet.
          </p>
        : null}
      </OpsPanel>

      <OpsPanel title="Catering inquiries" eyebrow="Correspondence" description="Email match on trimmed customer inbox.">
        {cateringInquiries.length === 0 ? (
          <p className="text-[13px] text-charcoal/55">None by this email.</p>
        ) : (
          <ul className="space-y-2 text-[13px]">
            {cateringInquiries.map((inq) => (
              <li key={inq.id} className="flex flex-wrap gap-2 rounded-lg border border-cream-dark/60 px-3 py-2">
                <Link href={`/admin/catering-inquiries/${inq.id}`} className="font-semibold text-teal-dark hover:underline">
                  {inq.eventDate ?? "?"}
                </Link>
                <OpsStatusPill variant="muted">{inq.status}</OpsStatusPill>
                <span className="text-charcoal/60">{inq.createdAt.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </OpsPanel>

      <OpsPanel title="Presence / sessions" eyebrow="Active clients" description="Rows from heartbeat stream (authenticated).">
        {presenceSessions.length === 0 ?
          <p className="text-[13px] text-charcoal/55">No session rows tied to Cognito subject yet.</p>
        : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-[12px]">
              <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[10px] uppercase tracking-[0.1em] text-charcoal/45">
                <tr>
                  <th className="px-2 py-2">Last activity</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Impersonated</th>
                  <th className="px-2 py-2">Route</th>
                  <th className="px-2 py-2">Public id</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/40">
                {presenceSessions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-2 py-2 whitespace-nowrap">{s.lastActivityAt.toLocaleString()}</td>
                    <td className="px-2 py-2">
                      {s.isActive && !s.terminatedAt ?
                        <OpsStatusPill variant="in_progress">active</OpsStatusPill>
                      : <OpsStatusPill variant="muted">ended</OpsStatusPill>}
                    </td>
                    <td className="px-2 py-2">{s.isImpersonated ? "yes" : "no"}</td>
                    <td className="px-2 py-2 truncate max-w-[200px]" title={s.currentRoute ?? ""}>
                      {s.currentRoute ?? "—"}
                    </td>
                    <td className="px-2 py-2 font-mono text-[11px]">{s.sessionPublicId.slice(0, 10)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OpsPanel>

      <OpsPanel title="Support impersonation ledger" eyebrow="Audit">
        {impersonationLedger.length === 0 ?
          <p className="text-[13px] text-charcoal/55">No ledger rows tied to subject/email.</p>
        : (
          <ul className="divide-y divide-cream-dark/50 text-[13px]">
            {impersonationLedger.map((row) => (
              <li key={row.id} className="py-3 flex flex-col gap-1">
                <p className="font-semibold text-charcoal">{row.actorEmail} → {row.targetEmail}</p>
                <p className="text-charcoal/60 text-[12px]">
                  Started {row.startedAt.toLocaleString()} · scope {row.scope}
                  {row.endedAt ? ` · ended ${row.endedAt.toLocaleString()}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </OpsPanel>

      <OpsPanel title="Operational activity & governance hints" eyebrow="Telemetry">
        {activityEvents.length === 0 && governanceRows.length === 0 ?
          <p className="text-[13px] text-charcoal/55">No operational rows yet for correlated ids.</p>
        : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mb-3">
                OperationalActivityEvent (latest)
              </p>
              <ul className="space-y-3 text-[12px] text-charcoal/80">
                {activityEvents.slice(0, 20).map((e) => (
                  <li key={e.id} className="border-l-[2px] border-teal-dark/35 pl-3">
                    <p className="text-[11px] text-charcoal/45">{e.createdAt.toLocaleString()} · {e.type}</p>
                    <p>{e.message}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mb-3">
                GovernanceAuditEvent (latest)
              </p>
              <ul className="space-y-3 text-[12px] text-charcoal/80">
                {governanceRows.slice(0, 20).map((g) => (
                  <li key={g.id} className="border-l-[2px] border-gold/40 pl-3">
                    <p className="text-[11px] text-charcoal/45">{g.createdAt.toLocaleString()} · {g.actionType}</p>
                    <p>{g.description ?? `${g.actorName} → ${g.targetName ?? "(no target name)"}`}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </OpsPanel>
    </div>
  );
}
