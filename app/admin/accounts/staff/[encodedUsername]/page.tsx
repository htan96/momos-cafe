import Link from "next/link";
import { notFound } from "next/navigation";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import StaffRoleChangePanel from "@/components/admin/accounts/StaffRoleChangePanel";
import StartCustomerImpersonation from "@/components/governance/StartCustomerImpersonation";
import { loadAccountMgmtStaffDetail } from "@/lib/accountManagement/loadAccountMgmtDetail";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
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

type PageProps = { params: Promise<{ encodedUsername: string }> };

export default async function AdminAccountStaffDetailPage(props: PageProps) {
  const { encodedUsername } = await props.params;
  const cfg = getCognitoConfig();
  const viewer = await getCognitoServerSession();
  const viewerSuper = Boolean(viewer?.groups && isSuperAdmin(viewer.groups));

  const detail = await loadAccountMgmtStaffDetail(encodedUsername, cfg);
  if ("error" in detail) {
    if (detail.error === "not_found") {
      notFound();
    }
    return (
      <div className="space-y-8">
        <OpsPageHeader
          eyebrow={false}
          title="Operator account"
          subtitle="This profile could not be loaded from Cognito with the supplied identifier."
          actions={
            <Link
              href="/admin/accounts"
              className="rounded-lg border border-cream-dark px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-charcoal hover:bg-cream-mid/40"
            >
              ← Accounts
            </Link>
          }
        />
        <OpsPanel title="Unavailable" eyebrow={detail.error === "cognito_unconfigured" ? "Config" : "Identity provider"}>
          <p className="text-[14px] text-charcoal/75">
            {detail.error === "cognito_unconfigured" ?
              "Cognito credentials are missing in this deployment — configure COGNITO_REGION / USER_POOL_ID / CLIENT_ID."
            : "The AWS Cognito directory call failed — verify IAM privileges for cognito-idp:AdminGetUser across this environment."}
          </p>
        </OpsPanel>
      </div>
    );
  }

  const { poolUser, groups, role, linkedCustomer, orders, presenceSessions, impersonationLedger, cateringInquiries } =
    detail;

  return (
    <div className="space-y-8">
      <OpsPageHeader
        eyebrow={false}
        title="Operator account"
        subtitle="Cognito pool membership tied to Postgres customer row when emails align."
        actions={
          <Link
            href="/admin/accounts"
            className="rounded-lg border border-cream-dark px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-charcoal hover:bg-cream-mid/40"
          >
            ← Accounts
          </Link>
        }
      />

      <OpsPanel title="Membership" eyebrow="Cognito">
        <dl className="grid gap-3 sm:grid-cols-2 text-[13px] text-charcoal/80">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Display</dt>
            <dd className="mt-1 text-charcoal">{detail.profile.displayName ?? poolUser.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Pools role</dt>
            <dd className="mt-1">
              <OpsStatusPill variant={role === "super_admin" ? "denied" : role === "admin" ? "open" : "muted"}>
                {role.replace("_", " ")}
              </OpsStatusPill>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Username</dt>
            <dd className="mt-1 font-mono text-[12px] break-all">{poolUser.username}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Subject</dt>
            <dd className="mt-1 font-mono text-[12px] break-all">{poolUser.sub}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Email</dt>
            <dd className="mt-1 break-all">{poolUser.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Signup (IdP)</dt>
            <dd className="mt-1">{poolUser.userCreateDate ? poolUser.userCreateDate.toLocaleString() : "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
              Assigned Cognito groups
            </dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {groups.length === 0 ?
                <span className="text-charcoal/50">—</span>
              : groups.map((g) => (
                  <OpsStatusPill key={g} variant="muted">
                    {g}
                  </OpsStatusPill>
                ))}
            </dd>
          </div>
          {linkedCustomer ?
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
                Linked Customer row
              </dt>
              <dd className="mt-1">
                <Link href={`/admin/accounts/customer/${linkedCustomer.id}`} className="text-teal-dark hover:underline">
                  Open customer detail · {linkedCustomer.id.slice(0, 8)}…
                </Link>
              </dd>
            </div>
          : null}
        </dl>

        {viewerSuper && viewer ?
          <div className="mt-6 space-y-4">
            <StaffRoleChangePanel
              cognitoUsername={poolUser.username}
              cognitoSub={poolUser.sub}
              currentRole={role}
              viewerSub={viewer.sub}
              viewerEmail={viewer.email ?? viewer.username ?? null}
            />

            <div className="rounded-xl border border-cream-dark/70 bg-cream/[0.15] px-4 py-3 space-y-2">
              <p className="text-[13px] text-charcoal/75">
                Start customer-scope impersonation for this diner if they share a verified Cognito email.
              </p>
              <StartCustomerImpersonation prefilledEmail={poolUser.email ?? null} />
              <p className="text-[11px] text-charcoal/50">
                Admin-scope impersonation remains deferred (middleware effective-groups not shipped).
              </p>
            </div>
          </div>
        : (
          <p className="mt-4 text-[12px] text-charcoal/55">
            Only super admins can adjust operator groups via this UI. Existing audit stream records changes.
          </p>
        )}
      </OpsPanel>

      <OpsPanel title="Order history" eyebrow="Linked commerce profile" description="Orders when Postgres customer matches operator email.">
        {orders.length === 0 ?
          <p className="text-[13px] text-charcoal/60">No linked commerce orders.</p>
        : (
          <ul className="divide-y divide-cream-dark/50">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-mono text-[12px] text-teal-dark">
                    {viewerSuper ?
                      <Link href={`/super-admin/order-operations/${o.id}`} className="hover:underline">
                        {o.id.slice(0, 8)}…
                      </Link>
                    : <span>{o.id.slice(0, 8)}…</span>}
                  </p>
                  <p className="text-[11px] text-charcoal/45">{o.createdAt.toLocaleString()} · status {o.status}</p>
                </div>
                <span className="text-[13px] font-semibold text-charcoal">{formatUsd(o.totalCents)}</span>
              </li>
            ))}
          </ul>
        )}
        {!viewerSuper && orders.length > 0 ?
          <p className="mt-3 text-[12px] text-charcoal/50">Use Order operations inside super-admin to open full dossiers.</p>
        : null}
      </OpsPanel>

      <OpsPanel title="Catering inquiries" eyebrow="Email match">
        {cateringInquiries.length === 0 ?
          <p className="text-[13px] text-charcoal/55">None by this inbox.</p>
        : (
          <ul className="space-y-2 text-[13px]">
            {cateringInquiries.map((inq) => (
              <li key={inq.id} className="flex flex-wrap gap-2 rounded-lg border border-cream-dark/60 px-3 py-2">
                <Link href={`/admin/catering-inquiries/${inq.id}`} className="font-semibold text-teal-dark hover:underline">
                  {inq.eventDate}
                </Link>
                <OpsStatusPill variant="muted">{inq.status}</OpsStatusPill>
                <span className="text-charcoal/60">{inq.createdAt.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </OpsPanel>

      <OpsPanel title="Presence & impersonation ledger" eyebrow="Session intelligence">
        {presenceSessions.length === 0 ?
          <p className="text-[13px] text-charcoal/55">No heartbeat rows indexed for this Cognito subject.</p>
        : (
          <div className="overflow-x-auto mb-8">
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

        {impersonationLedger.length === 0 ?
          <p className="text-[13px] text-charcoal/55">Ledger empty.</p>
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

      <OpsPanel title="Governance audit & operational feed" eyebrow="Correlated timelines">
        {detail.activityEvents.length === 0 && detail.governanceRows.length === 0 ?
          <p className="text-[13px] text-charcoal/55">No correlated rows returned.</p>
        : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mb-3">
                OperationalActivityEvent
              </p>
              <ul className="space-y-3 text-[12px] text-charcoal/80">
                {detail.activityEvents.slice(0, 24).map((e) => (
                  <li key={e.id} className="border-l-[2px] border-teal-dark/35 pl-3">
                    <p className="text-[11px] text-charcoal/45">{e.createdAt.toLocaleString()} · {e.type}</p>
                    <p>{e.message}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mb-3">
                GovernanceAuditEvent
              </p>
              <ul className="space-y-3 text-[12px] text-charcoal/80">
                {detail.governanceRows.slice(0, 24).map((g) => (
                  <li key={g.id} className="border-l-[2px] border-gold/35 pl-3">
                    <p className="text-[11px] text-charcoal/45">{g.createdAt.toLocaleString()} · {g.actionType}</p>
                    <p>{g.description ?? `${g.actorName}→${g.targetName ?? "(target)"}`}</p>
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
