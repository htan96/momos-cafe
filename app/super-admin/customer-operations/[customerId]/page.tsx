import Link from "next/link";
import type { OperationalActivityEvent, OperationalActivitySeverity } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StartCustomerImpersonation from "@/components/governance/StartCustomerImpersonation";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import { operationalIncidentWhereForCustomer } from "@/lib/operations/operationalContextLinks";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CUSTOMER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PRESENCE_RECENT_MS = 24 * 60 * 60 * 1000;

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function severityPillVariant(sev: OperationalActivitySeverity): StatusPillVariant {
  switch (sev) {
    case "info":
      return "neutral";
    case "warning":
      return "warning";
    case "error":
      return "degraded";
    case "critical":
      return "critical";
    default:
      return "neutral";
  }
}

function displayNameFromAuth(meta: unknown): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const am = meta as Record<string, unknown>;
  for (const key of ["fullName", "name", "displayName"] as const) {
    const v = am[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function buildCustomerActivityWhere(customer: {
  id: string;
  email: string | null;
  externalAuthSubject: string | null;
}): Prisma.OperationalActivityEventWhereInput {
  const or: Prisma.OperationalActivityEventWhereInput[] = [
    { metadata: { path: ["customerId"], equals: customer.id } },
    { actorId: customer.id },
  ];
  if (customer.externalAuthSubject?.trim()) {
    or.push({ actorId: customer.externalAuthSubject.trim() });
  }
  const mail = customer.email?.trim();
  if (mail) {
    const lower = mail.toLowerCase();
    or.push({ metadata: { path: ["targetEmail"], equals: lower } });
    if (lower !== mail) {
      or.push({ metadata: { path: ["targetEmail"], equals: mail } });
    }
  }
  return { OR: or };
}

function OperationalActivityEventRow({ row }: { row: OperationalActivityEvent }) {
  return (
    <li className="py-4 first:pt-0 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <time
            dateTime={row.createdAt.toISOString()}
            className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45"
          >
            {row.createdAt.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
          <StatusPill variant={severityPillVariant(row.severity)}>{row.severity}</StatusPill>
          <span className="text-[11px] font-mono text-charcoal/55 break-all">{row.type}</span>
        </div>
        <p className="text-[13px] text-charcoal leading-snug">{row.message}</p>
        {(row.actorType || row.actorId || row.actorName || row.source) && (
          <p className="text-[12px] text-charcoal/55 leading-relaxed">
            {[row.actorType, row.actorId ? `id:${row.actorId.slice(0, 12)}${row.actorId.length > 12 ? "…" : ""}` : null, row.actorName, row.source]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
    </li>
  );
}

type PageProps = { params: Promise<{ customerId: string }> };

export default async function SuperAdminCustomerDetailPage(props: PageProps) {
  const { customerId } = await props.params;
  if (!CUSTOMER_ID_RE.test(customerId)) {
    notFound();
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      email: true,
      phone: true,
      externalAuthSubject: true,
      squareCustomerId: true,
      authMetadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!customer) {
    notFound();
  }

  const cognitoSub = customer.externalAuthSubject?.trim() ?? null;
  const emailTrim = customer.email?.trim() ?? null;

  const impersonationWhere =
    emailTrim || cognitoSub
      ? {
          OR: [
            ...(emailTrim
              ? [{ targetEmail: { equals: emailTrim, mode: "insensitive" as const } }]
              : []),
            ...(cognitoSub ? [{ targetSub: cognitoSub }] : []),
          ],
        }
      : null;

  const activityWhere = buildCustomerActivityWhere(customer);

  const [orders, presenceSessions, activityEvents, relatedIncidents, impersonationLedger, cateringInquiries] =
    await Promise.all([
      prisma.commerceOrder.findMany({
        where: { customerId: customer.id },
        take: 15,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          totalCents: true,
          createdAt: true,
        },
      }),
      cognitoSub
        ? prisma.platformPresenceSession.findMany({
            where: { cognitoSub },
            orderBy: { lastActivityAt: "desc" },
            take: 50,
          })
        : Promise.resolve([]),
      prisma.operationalActivityEvent.findMany({
        where: activityWhere,
        orderBy: { createdAt: "desc" },
        take: 75,
      }),
      prisma.operationalIncident.findMany({
        where: operationalIncidentWhereForCustomer(customer.id, emailTrim),
        orderBy: { lastDetectedAt: "desc" },
        take: 25,
      }),
      impersonationWhere
        ? prisma.impersonationSupportSession.findMany({
            where: impersonationWhere,
            orderBy: { startedAt: "desc" },
            take: 10,
          })
        : Promise.resolve([]),
      emailTrim
        ? prisma.cateringInquiry.findMany({
            where: { email: { equals: emailTrim, mode: "insensitive" } },
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
    ]);

  const now = Date.now();
  const presenceRecentCutoff = new Date(now - PRESENCE_RECENT_MS);
  const presenceRecent = presenceSessions.filter(
    (s) => s.lastActivityAt >= presenceRecentCutoff && s.isActive && !s.terminatedAt
  );

  const displayName = displayNameFromAuth(customer.authMetadata);

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Platform · Customers"
        title={`Customer · ${customer.id.slice(0, 8)}…`}
        subtitle="Profile fields from `customers`, recent commerce orders, presence keyed by `external_auth_subject` ↔ `platform_presence_sessions.cognito_sub`, and operational events matched on metadata / actor linkage (coverage depends on emitters)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/super-admin/customer-operations"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              All customers
            </Link>
            <Link
              href="/super-admin/customer-lookup"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Lookup
            </Link>
          </div>
        }
      />

      <OperationalCard title="Profile" meta="customers">
        <dl className="grid gap-3 sm:grid-cols-2 text-[13px]">
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Customer id</dt>
            <dd className="mt-1 font-mono text-[12px] text-charcoal/80 break-all">{customer.id}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Display (auth metadata)</dt>
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
          {customer.authMetadata != null ? (
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">auth_metadata</dt>
              <dd className="mt-1 rounded-md border border-cream-dark/50 bg-white/80 p-2 font-mono text-[11px] text-charcoal/80 overflow-x-auto">
                {JSON.stringify(customer.authMetadata, null, 2)}
              </dd>
            </div>
          ) : null}
        </dl>
      </OperationalCard>

      <OperationalCard title="Support impersonation" meta="super-admin · customer scope">
        {emailTrim ? (
          <>
            <p className="text-[13px] text-charcoal/65 leading-relaxed mb-1">
              Starts a signed impersonation cookie for this diner&apos;s email. The target must exist in Cognito; ledger
              + operational events record the action.
            </p>
            <StartCustomerImpersonation key={customer.id} prefilledEmail={emailTrim} />
          </>
        ) : (
          <p className="text-[13px] text-charcoal/60 leading-relaxed">
            This customer row has no email on file. Customer-scope impersonation is started by verified Cognito email
            only — use{" "}
            <Link href="/super-admin/customer-lookup" className="text-teal-dark font-medium hover:underline">
              Customer lookup
            </Link>{" "}
            if you need manual entry.
          </p>
        )}
      </OperationalCard>

      <OperationalCard title="Related incidents" meta="operational_incidents · active · heuristic">
        {relatedIncidents.length === 0 ? (
          <p className="text-[13px] text-charcoal/55 leading-relaxed">
            No active incidents matched <span className="font-mono">metadata.customerId</span>, optional{" "}
            <span className="font-mono">metadata.targetEmail</span>, or the short customer id in title/description.
          </p>
        ) : (
          <ul className="space-y-2 text-[13px] text-charcoal/80">
            {relatedIncidents.map((inc) => (
              <li key={inc.id}>
                <span className="font-medium">{inc.title}</span>
                <span className="text-charcoal/45">
                  {" "}
                  · {inc.severity} · {inc.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </OperationalCard>

      <OperationalCard title="Impersonation ledger" meta="impersonation_support_sessions · last 10">
        {!impersonationWhere ? (
          <p className="text-[13px] text-charcoal/55 leading-relaxed">
            Need at least one of profile email or Cognito subject to match{" "}
            <span className="font-mono">target_email</span> / <span className="font-mono">target_sub</span>.
          </p>
        ) : impersonationLedger.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No ledger rows for this profile.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
            <table className="w-full min-w-[36rem] text-left text-[12px]">
              <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[10px] uppercase tracking-[0.08em] text-charcoal/50">
                <tr>
                  <th className="px-2 py-2 font-semibold">Actor</th>
                  <th className="px-2 py-2 font-semibold">Target</th>
                  <th className="px-2 py-2 font-semibold">Scope</th>
                  <th className="px-2 py-2 font-semibold">Started</th>
                  <th className="px-2 py-2 font-semibold">Ended</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/40">
                {impersonationLedger.map((row) => (
                  <tr key={row.id} className="bg-white/80">
                    <td className="px-2 py-2 align-top break-all">{row.actorEmail}</td>
                    <td className="px-2 py-2 align-top">
                      <span className="break-all">{row.targetEmail}</span>
                      {row.targetSub ? (
                        <span className="block font-mono text-[10px] text-charcoal/45 break-all">{row.targetSub}</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <StatusPill variant="warning">{row.scope}</StatusPill>
                    </td>
                    <td className="px-2 py-2 align-top whitespace-nowrap text-charcoal/70">
                      {row.startedAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-2 py-2 align-top whitespace-nowrap text-charcoal/70">
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

      <OperationalCard title="Catering inquiries" meta="catering_inquiries · email match">
        {!emailTrim ? (
          <p className="text-[13px] text-charcoal/55 leading-relaxed">
            No profile email — model only ties inquiries by submitted email (no customer FK).
          </p>
        ) : cateringInquiries.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No inquiries stored with this email.</p>
        ) : (
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
                  {inq.createdAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </OperationalCard>

      <OperationalCard title="Recent commerce orders" meta="commerce_orders · 15">
        {orders.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No linked `CommerceOrder` rows for this profile.</p>
        ) : (
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

      <OperationalCard title="Platform presence" meta="platform_presence_sessions">
        {!cognitoSub ? (
          <div className="space-y-2 text-[13px] text-charcoal/70 leading-relaxed">
            <p>No `external_auth_subject` on this customer row — presence is stored by Cognito `cognito_sub` only (there is no email column on `PlatformPresenceSession`).</p>
            <p className="text-[12px] text-charcoal/55">
              After the auth subject is populated for this profile, heartbeat rows will appear here automatically.
            </p>
          </div>
        ) : presenceSessions.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No presence sessions recorded for this Cognito subject yet.</p>
        ) : (
          <>
            {presenceRecent.length > 0 ? (
              <div className="mb-6 rounded-lg border border-teal-dark/15 bg-teal-dark/[0.04] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">
                  Active in the last 24h · {presenceRecent.length}
                </p>
                <ul className="space-y-2 text-[12px] text-charcoal/80">
                  {presenceRecent.map((s) => (
                    <li key={s.id} className="flex flex-wrap gap-x-3 gap-y-1">
                      <span className="font-mono text-[11px] text-charcoal/55">{s.sessionPublicId.slice(0, 12)}…</span>
                      {s.isImpersonated ? <StatusPill variant="warning">Impersonated</StatusPill> : null}
                      <span>{s.userType}{s.userRole ? ` · ${s.userRole}` : ""}</span>
                      <span className="text-charcoal/55">
                        last {s.lastActivityAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
              <table className="w-full min-w-[48rem] text-left text-[13px]">
                <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Session</th>
                    <th className="px-3 py-2 font-semibold">Type</th>
                    <th className="px-3 py-2 font-semibold">Display</th>
                    <th className="px-3 py-2 font-semibold">Route</th>
                    <th className="px-3 py-2 font-semibold">Last activity</th>
                    <th className="px-3 py-2 font-semibold">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark/40">
                  {presenceSessions.map((s) => (
                    <tr key={s.id} className="bg-white/80">
                      <td className="px-3 py-2 font-mono text-[11px] text-charcoal/65">{s.sessionPublicId.slice(0, 10)}…</td>
                      <td className="px-3 py-2 text-[12px]">
                        {s.userType}
                        {s.userRole ? ` · ${s.userRole}` : ""}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-charcoal/75">{s.displayName?.trim() || "—"}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-charcoal/60 break-all max-w-[12rem]">
                        {s.currentRoute?.trim() || "—"}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-charcoal/60">
                        {s.lastActivityAt.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {s.isActive ? <StatusPill variant="ok">Active</StatusPill> : <StatusPill variant="neutral">Idle</StatusPill>}
                          {s.isImpersonated ? <StatusPill variant="warning">Impersonated</StatusPill> : null}
                          {s.terminatedAt ? <StatusPill variant="degraded">Ended</StatusPill> : null}
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

      <OperationalCard title="Operational activity" meta="operational_activity_events · heuristic match">
        {activityEvents.length === 0 ? (
          <div className="space-y-2 text-[13px] text-charcoal/70 leading-relaxed">
            <p>No operational events matched this profile with the current filters.</p>
            <p className="text-[12px] text-charcoal/55">
              We include rows where <span className="font-mono">metadata.customerId</span> equals this customer id,{" "}
              <span className="font-mono">metadata.targetEmail</span> equals the profile email (case variants), or{" "}
              <span className="font-mono">actorId</span> equals the Prisma id / Cognito subject. Many emitters attach only
              order or payment ids — open an order from the table above for the full commerce timeline.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-cream-dark/40">
            {activityEvents.map((row) => (
              <OperationalActivityEventRow key={row.id} row={row} />
            ))}
          </ul>
        )}
      </OperationalCard>
    </div>
  );
}
