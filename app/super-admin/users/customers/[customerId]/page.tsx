import Link from "next/link";
import { notFound } from "next/navigation";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StartCustomerImpersonation from "@/components/governance/StartCustomerImpersonation";
import StatusPill from "@/components/governance/StatusPill";
import CustomerOperationalTimeline from "@/components/super-admin/users/customers/CustomerOperationalTimeline";
import CustomerRevokeSessionsStub from "@/components/super-admin/users/customers/CustomerRevokeSessionsStub";
import { loadSuperAdminCustomerDossier } from "@/lib/accountManagement/loadSuperAdminCustomerDossier";
import { displayNameFromAuth } from "@/lib/accountManagement/accountsBrowse";

export const dynamic = "force-dynamic";

const PRESENCE_RECENT_MS = 24 * 60 * 60 * 1000;

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

type PageProps = { params: Promise<{ customerId: string }> };

export default async function SuperAdminUserCustomerDossierPage(props: PageProps) {
  const { customerId } = await props.params;

  const detail = await loadSuperAdminCustomerDossier(customerId);
  if (!detail) notFound();

  const {
    customer,
    emailTrim,
    cognitoSub,
    impersonationWhere,
    orders,
    payments,
    shipments,
    impersonationLedger,
    presenceSessions,
    relatedIncidents,
    cateringInquiries,
    timelineRows,
    openIncidentCount,
  } = detail;

  const displayName = displayNameFromAuth(customer.authMetadata);

  const now = Date.now();
  const presenceRecentCutoff = new Date(now - PRESENCE_RECENT_MS);
  const presenceRecent = presenceSessions.filter(
    (s) => s.lastActivityAt >= presenceRecentCutoff && s.isActive && !s.terminatedAt
  );

  const failingPayments = payments.filter((p) => {
    const st = p.status?.trim().toLowerCase() ?? "";
    return st === "failed" || Boolean(p.failureReason?.trim());
  });

  const paymentFailedBadge =
    failingPayments.length > 0 ?
      `${failingPayments.length} PaymentRecord failure${failingPayments.length === 1 ? "" : "s"}`
    : null;

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Users · Customers"
        title={`Dossier · ${displayName ?? emailTrim ?? customer.id.slice(0, 8) + "…"}`}
        subtitle="Operational read model from `customers`, related `commerce_orders`, `payment_records`, `shipments`, presence (`platform_presence_sessions` keyed by Cognito sub), impersonation ledger, incidents, failures inbox, and a merged governance + ops timeline."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/super-admin/operations/failures?customerId=${encodeURIComponent(customer.id)}`}
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Failures (customer scoped)
            </Link>
            <Link
              href="/super-admin/users/customers"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Directory
            </Link>
          </div>
        }
      />

      <OperationalCard title="Signals" meta="Grounded badges only">
        <div className="flex flex-wrap gap-2">
          {paymentFailedBadge ? (
            <StatusPill variant="degraded">{`payment_failed · ${paymentFailedBadge}`}</StatusPill>
          ) : null}
          <StatusPill variant={openIncidentCount > 0 ? "warning" : "neutral"}>
            {`${openIncidentCount} open incident${openIncidentCount === 1 ? "" : "s"}`}
          </StatusPill>
        </div>
      </OperationalCard>

      <OperationalCard title="Identity" meta="customers">
        <dl className="grid gap-3 sm:grid-cols-2 text-[13px]">
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Customer id</dt>
            <dd className="mt-1 font-mono text-[12px] text-charcoal/80 break-all">{customer.id}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Display</dt>
            <dd className="mt-1 text-charcoal/80">{displayName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Email</dt>
            <dd className="mt-1 text-charcoal/80 break-all">{emailTrim ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Phone</dt>
            <dd className="mt-1 text-charcoal/80">{customer.phone?.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Cognito subject</dt>
            <dd className="mt-1 font-mono text-[11px] text-charcoal/70 break-all">{cognitoSub ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Square customer id</dt>
            <dd className="mt-1 font-mono text-[11px] text-charcoal/70 break-all">{customer.squareCustomerId?.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Created</dt>
            <dd className="mt-1 text-charcoal/80">
              {customer.createdAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Updated</dt>
            <dd className="mt-1 text-charcoal/80">
              {customer.updatedAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
            </dd>
          </div>
        </dl>
      </OperationalCard>

      <OperationalCard title="Operational timeline" meta="OperationalActivityEvent + GovernanceAuditEvent">
        <CustomerOperationalTimeline rows={timelineRows} />
      </OperationalCard>

      <OperationalCard title="Payments" meta="PaymentRecord via orders · recent 50">
        {payments.length === 0 ?
          <p className="text-[13px] text-charcoal/60">No `PaymentRecord` rows linked to orders for this customer.</p>
        : (
          <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
            <table className="w-full min-w-[44rem] text-left text-[12px]">
              <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[10px] uppercase tracking-[0.08em] text-charcoal/50">
                <tr>
                  <th className="px-2 py-2 font-semibold">Payment</th>
                  <th className="px-2 py-2 font-semibold">Order</th>
                  <th className="px-2 py-2 font-semibold">Amount</th>
                  <th className="px-2 py-2 font-semibold">Statuses</th>
                  <th className="px-2 py-2 font-semibold">Risk signal</th>
                  <th className="px-2 py-2 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/40">
                {payments.map((p) => {
                  const st = p.status?.trim().toLowerCase() ?? "";
                  const risky = st === "failed" || Boolean(p.failureReason?.trim());
                  return (
                    <tr key={p.id} className="bg-white/80">
                      <td className="px-2 py-2 font-mono text-[11px] text-charcoal/65">{p.id.slice(0, 8)}…</td>
                      <td className="px-2 py-2">
                        {p.orderId ?
                          <Link
                            href={`/super-admin/order-operations/${p.orderId}`}
                            className="font-mono text-teal-dark hover:underline"
                            title={p.orderId}
                          >
                            {p.orderId.slice(0, 8)}…
                          </Link>
                        : (
                          <span className="text-charcoal/45">orphan-row</span>
                        )}
                        {p.order?.status ?
                          <span className="block text-[10px] text-charcoal/45">order · {p.order.status}</span>
                        : null}
                      </td>
                      <td className="px-2 py-2">{formatUsd(p.amountCents)}</td>
                      <td className="px-2 py-2 text-[11px]">
                        {[p.status, p.squarePaymentStatus].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-2 py-2">
                        {risky ?
                          <StatusPill variant="degraded">{p.failureReason?.slice(0, 48) || "payment_failed"}</StatusPill>
                        : (
                          <StatusPill variant="neutral">clean</StatusPill>
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-charcoal/65">
                        {p.createdAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </OperationalCard>

      <OperationalCard title="Shipments" meta="Shipment → FulfillmentGroup → CommerceOrder">
        {shipments.length === 0 ?
          <p className="text-[13px] text-charcoal/60">No `Shipment` rows for this diner&apos;s orders yet.</p>
        : (
          <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
            <table className="w-full min-w-[42rem] text-left text-[12px]">
              <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[10px] uppercase tracking-[0.08em] text-charcoal/50">
                <tr>
                  <th className="px-2 py-2 font-semibold">Shipment</th>
                  <th className="px-2 py-2 font-semibold">Order</th>
                  <th className="px-2 py-2 font-semibold">Status</th>
                  <th className="px-2 py-2 font-semibold">Carrier / tracking</th>
                  <th className="px-2 py-2 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/40">
                {shipments.map((s) => (
                  <tr key={s.id} className="bg-white/80">
                    <td className="px-2 py-2 font-mono text-[11px]">{s.id.slice(0, 8)}…</td>
                    <td className="px-2 py-2">
                      <Link
                        href={`/super-admin/order-operations/${s.fulfillmentGroup.orderId}`}
                        className="font-mono text-teal-dark hover:underline"
                      >
                        {s.fulfillmentGroup.orderId.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-2 py-2">
                      <StatusPill variant="neutral">{s.status}</StatusPill>
                    </td>
                    <td className="px-2 py-2">
                      {[s.carrier, s.trackingNumber].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-2 py-2 text-charcoal/65 whitespace-nowrap">
                      {s.updatedAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OperationalCard>

      <OperationalCard title="Governance · Cognito revoke (stub)" meta="Writes audit · no IAM call yet">
        <CustomerRevokeSessionsStub customerId={customer.id} hasCognitoSub={Boolean(cognitoSub)} />
      </OperationalCard>

      <OperationalCard title="Support impersonation" meta="TTL 8h · HttpOnly cookie · banner in platform shell">
        {emailTrim ?
          <>
            <p className="text-[13px] text-charcoal/65 leading-relaxed mb-1">
              Super-admin scoped preview: signed `momos_impersonation` cookie (8 hour max-age); ledger + governance append
              on start/end. Banner renders above super-admin/workspace chrome via{" "}
              <span className="font-mono">ImpersonationBanner</span>.
            </p>
            <StartCustomerImpersonation prefilledEmail={emailTrim} />
          </>
        : (
          <p className="text-[13px] text-charcoal/60 leading-relaxed">
            Missing profile email — customer-scope impersonation only targets Cognito users by verified email after pool
            lookup.
          </p>
        )}
      </OperationalCard>

      <OperationalCard title="Related incidents (open)" meta="operationalIncidentWhereForCustomer">
        {relatedIncidents.length === 0 ?
          <p className="text-[13px] text-charcoal/55 leading-relaxed">No matched open incidents.</p>
        : (
          <ul className="space-y-2 text-[13px] text-charcoal/80">
            {relatedIncidents.map((inc) => (
              <li key={inc.id}>
                <span className="font-medium">{inc.title}</span>
                <span className="text-charcoal/45">{` · ${inc.severity} · ${inc.status}`}</span>
              </li>
            ))}
          </ul>
        )}
      </OperationalCard>

      <OperationalCard title="Impersonation ledger" meta="impersonation_support_sessions · justification from governance.reason">
        {!impersonationWhere ?
          <p className="text-[13px] text-charcoal/55 leading-relaxed">Need profile email or Cognito subject.</p>
        : impersonationLedger.length === 0 ?
          <p className="text-[13px] text-charcoal/60">No ledger rows matched.</p>
        : (
          <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
            <table className="w-full min-w-[42rem] text-left text-[12px]">
              <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[10px] uppercase tracking-[0.08em] text-charcoal/50">
                <tr>
                  <th className="px-2 py-2 font-semibold">Actor</th>
                  <th className="px-2 py-2 font-semibold">Target</th>
                  <th className="px-2 py-2 font-semibold">Justification</th>
                  <th className="px-2 py-2 font-semibold">Scope</th>
                  <th className="px-2 py-2 font-semibold">Started</th>
                  <th className="px-2 py-2 font-semibold">Ended</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/40">
                {impersonationLedger.map((row) => (
                  <tr key={row.id} className="bg-white/80 align-top">
                    <td className="px-2 py-2 break-all">{row.actorEmail}</td>
                    <td className="px-2 py-2">
                      <span className="break-all">{row.targetEmail}</span>
                      {row.targetSub ?
                        <span className="block font-mono text-[10px] text-charcoal/45 break-all">{row.targetSub}</span>
                      : null}
                    </td>
                    <td className="px-2 py-2 text-[11px] text-charcoal/70 whitespace-pre-wrap">{row.justification ?? "—"}</td>
                    <td className="px-2 py-2">
                      <StatusPill variant="warning">{row.scope}</StatusPill>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-charcoal/70">
                      {row.startedAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-charcoal/70">
                      {row.endedAt
                        ? row.endedAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OperationalCard>

      <OperationalCard title="Orders" meta="commerce_orders · order-operations">
        {orders.length === 0 ?
          <p className="text-[13px] text-charcoal/60">No commerce orders tied to this customer.</p>
        : (
          <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
            <table className="w-full min-w-[40rem] text-left text-[13px]">
              <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                <tr>
                  <th className="px-3 py-2 font-semibold">Order</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Total</th>
                  <th className="px-3 py-2 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/40">
                {orders.map((o) => (
                  <tr key={o.id} className="bg-white/80">
                    <td className="px-3 py-2">
                      <Link
                        href={`/super-admin/order-operations/${o.id}`}
                        className="font-mono text-[12px] text-teal-dark hover:underline"
                        title={o.id}
                      >
                        {o.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill variant="neutral">{o.status}</StatusPill>
                    </td>
                    <td className="px-3 py-2 font-medium text-charcoal">{formatUsd(o.totalCents)}</td>
                    <td className="px-3 py-2 text-[12px] text-charcoal/60">
                      {o.createdAt.toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OperationalCard>

      <OperationalCard title="Platform presence" meta="external_auth_subject → cognito_sub">
        {!cognitoSub ?
          <p className="text-[13px] text-charcoal/70 leading-relaxed">
            No Cognito subject on this row — heartbeat sessions key off `external_auth_subject` only.
          </p>
        : presenceSessions.length === 0 ?
          <p className="text-[13px] text-charcoal/60">No presence rows yet.</p>
        : (
          <>
            {presenceRecent.length > 0 ?
              <div className="mb-6 rounded-lg border border-teal-dark/15 bg-teal-dark/[0.04] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">
                  Active · 24h · {presenceRecent.length}
                </p>
                <ul className="space-y-2 text-[12px] text-charcoal/80">
                  {presenceRecent.map((s) => (
                    <li key={s.id} className="flex flex-wrap gap-x-3 gap-y-1">
                      <span className="font-mono text-[11px] text-charcoal/55">{s.sessionPublicId.slice(0, 12)}…</span>
                      {s.isImpersonated ? <StatusPill variant="warning">Impersonated</StatusPill> : null}
                      <span>{s.userType}</span>
                      <span className="text-charcoal/55">
                        last{" "}
                        {s.lastActivityAt.toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            : null}
            <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
              <table className="w-full min-w-[46rem] text-left text-[12px]">
                <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[10px] uppercase tracking-[0.08em] text-charcoal/50">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Session</th>
                    <th className="px-2 py-2 font-semibold">Surface</th>
                    <th className="px-2 py-2 font-semibold">Route</th>
                    <th className="px-2 py-2 font-semibold">Activity</th>
                    <th className="px-2 py-2 font-semibold">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark/40">
                  {presenceSessions.map((s) => (
                    <tr key={s.id}>
                      <td className="px-2 py-2 font-mono text-[11px]">{s.sessionPublicId.slice(0, 12)}…</td>
                      <td className="px-2 py-2">{[s.userType, s.userRole].filter(Boolean).join(" · ")}</td>
                      <td className="px-2 py-2 font-mono text-[10px] break-all max-w-[14rem]">
                        {s.currentRoute ?? "—"}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-charcoal/65">
                        {s.lastActivityAt.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          {s.isActive ?
                            <StatusPill variant="ok">Active</StatusPill>
                          : <StatusPill variant="neutral">Idle</StatusPill>}
                          {s.isImpersonated ? <StatusPill variant="warning">Impersonated</StatusPill> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </OperationalCard>

      <OperationalCard title="Catering inquiries" meta="Email match · no FK">
        {!emailTrim ?
          <p className="text-[13px] text-charcoal/55 leading-relaxed">No profile email to match inquiries.</p>
        : cateringInquiries.length === 0 ?
          <p className="text-[13px] text-charcoal/60">No inquiries for this mailbox.</p>
        : (
          <ul className="space-y-2 text-[13px]">
            {cateringInquiries.map((inq) => (
              <li key={inq.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link
                  href={`/super-admin/catering-inquiries/${inq.id}`}
                  className="font-mono text-[12px] text-teal-dark hover:underline"
                >
                  {inq.id.slice(0, 8)}…
                </Link>
                <StatusPill variant="neutral">{inq.status}</StatusPill>
                <span className="text-charcoal/55 text-[12px]">
                  {inq.createdAt.toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </OperationalCard>
    </div>
  );
}
