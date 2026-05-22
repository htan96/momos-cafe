import Link from "next/link";
import { WebhookProcessingStatus } from "@prisma/client";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import OperationalBreadcrumbs from "@/components/super-admin/operations/OperationalBreadcrumbs";
import OperationalCrossLinks from "@/components/super-admin/operations/OperationalCrossLinks";
import OperationalEscalationBanner from "@/components/super-admin/operations/OperationalEscalationBanner";
import { orphanSquarePaymentOperationalContext } from "@/components/super-admin/operations/operationalIncidentPresets";
import { superAdminOperationsBreadcrumbs } from "@/components/super-admin/operations/superAdminOperationsBreadcrumbs";
import { buildSquareDashboardLinks } from "@/lib/commerce/squareOperationalVisibility";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { WEBHOOK_OPS_EVENT_TYPES } from "@/lib/operations/queryWebhookOpsActivityForCommerceOrder";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

/** Hours before we flag stuck `pending_payment` commerce shells (best-effort; override via env in deployment). */
const STALE_PENDING_HOURS = (() => {
  const raw = process.env.OPS_PENDING_PAYMENT_STALE_HOURS?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 1 ? n : 72;
})();

const FAILED_PAYMENT_STATUSES = ["failed"] as const;

function pillForPaymentStatus(status: string): StatusPillVariant {
  const s = status.toLowerCase();
  if (s === "completed") return "neutral";
  if (s === "pending") return "warning";
  if (s === "failed") return "degraded";
  return "neutral";
}

function fmtShort(iso: Date): string {
  return iso.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function readSquarePaymentIdFromOpsRow(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const m = metadata as Record<string, unknown>;
  const d =
    m.detail && typeof m.detail === "object" && !Array.isArray(m.detail)
      ? (m.detail as Record<string, unknown>)
      : {};
  const sid =
    typeof d.squarePaymentId === "string"
      ? d.squarePaymentId
      : typeof m.squarePaymentId === "string"
        ? m.squarePaymentId
        : null;
  const t = sid?.trim();
  return t || null;
}

export default async function SuperAdminOperationalPaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ paymentsPage?: string }>;
}) {
  const rawPage = searchParams ? (await searchParams).paymentsPage : undefined;
  const pageNum = Math.max(1, Math.min(250, Number.parseInt(rawPage ?? "1", 10) || 1));

  const staleCutoff = new Date(Date.now() - STALE_PENDING_HOURS * 3600 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [failedPayments, stalePendingOrders, webhookRows, orphanReceipts, orphanOpsEvents, counts] =
    await Promise.all([
    prisma.paymentRecord.findMany({
      where: { status: { in: [...FAILED_PAYMENT_STATUSES] } },
      include: {
        order: { select: { id: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
    }),
    prisma.commerceOrder.findMany({
      where: {
        status: "pending_payment",
        updatedAt: { lt: staleCutoff },
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        totalCents: true,
        customer: { select: { email: true } },
        payments: {
          select: {
            id: true,
            status: true,
            squarePaymentStatus: true,
            amountCents: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { updatedAt: "asc" },
      take: 75,
    }),
    prisma.operationalActivityEvent.findMany({
      where: {
        type: { in: [...WEBHOOK_OPS_EVENT_TYPES, PLATFORM_EVENT_SUBTYPE.PAYMENT_REGISTER_FAILED] },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.webhookDeliveryReceipt.findMany({
      where: {
        provider: "square",
        receivedAt: { gte: sevenDaysAgo },
        OR: [
          { processingStatus: WebhookProcessingStatus.failed, errorCode: "ORPHAN_NO_LOCAL_PAYMENT" },
          { errorCode: "ORPHAN_NO_LOCAL_PAYMENT" },
        ],
      },
      orderBy: { receivedAt: "desc" },
      take: 40,
    }),
    prisma.operationalActivityEvent.findMany({
      where: {
        type: PLATFORM_EVENT_SUBTYPE.PAYMENT_SQUARE_ORPHAN_WEBHOOK,
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.paymentRecord.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { status: { in: ["pending", "failed", "completed"] } },
    }),
  ]);

  const hasMoreFailed = failedPayments.length > PAGE_SIZE;
  const failedPaymentsPage = hasMoreFailed ? failedPayments.slice(0, PAGE_SIZE) : failedPayments;

  const nextPage = pageNum + 1;
  const prevPage = pageNum > 1 ? pageNum - 1 : null;
  const orphanDrillIn = orphanSquarePaymentOperationalContext();
  const orphanEscalated = orphanReceipts.length + orphanOpsEvents.length > 0;

  return (
    <div className="space-y-8">
      <OperationalBreadcrumbs segments={superAdminOperationsBreadcrumbs("Payments")} className="-mb-2" />

      <OperationalEscalationBanner forceShow={orphanEscalated} title="Incident drill-in · orphan webhook path">
        <p>
          There are orphan Square webhook receipts or orphan <span className="font-semibold font-mono">payment.square</span> activity rows in the trailing window.
          Follow the playbook below before invoking recovery endpoints.
        </p>
      </OperationalEscalationBanner>
      <GovPageHeader
        eyebrow="Platform · Payments"
        title="Payments operations"
        subtitle="Read-only Postgres surfaces only — PSP money movement stays outside this console. Rows align with lowercase `payment_records.status` plus stuck `commerce_orders.pending_payment` shells."
        actions={
          <>
            <Link
              href="/super-admin/live-activity?filter=PAYMENTS"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Live activity · PAYMENTS filter
            </Link>
            <Link
              href="/super-admin/operations/failures"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Failures inbox
            </Link>
          </>
        }
      />

      <OperationalCard title="Local payment aggregates" meta="payment_records">
        <p className="text-[13px] text-charcoal/70 mb-3">
          Stuck pending-payment window configured to <span className="font-mono">{STALE_PENDING_HOURS}h</span> via{" "}
          <span className="font-mono">OPS_PENDING_PAYMENT_STALE_HOURS</span>.
        </p>
        <ul className="flex flex-wrap gap-2">
          {counts.map((c) => (
            <StatusPill key={c.status} variant={pillForPaymentStatus(c.status)}>
              {c.status}:{c._count._all}
            </StatusPill>
          ))}
        </ul>
      </OperationalCard>

      <OperationalCard title="Stale pending_payment orders" meta={`commerce_orders · ${stalePendingOrders.length}`}>
        {stalePendingOrders.length === 0 ? (
          <p className="text-[13px] text-charcoal/62">Nothing older than cutoff right now.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
            <table className="w-full min-w-[44rem] text-left text-[13px]">
              <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                <tr>
                  <th className="px-3 py-2 font-semibold">Order</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Stale since</th>
                  <th className="px-3 py-2 font-semibold">Total</th>
                  <th className="px-3 py-2 font-semibold">Linked payments snapshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/40">
                {stalePendingOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-3 py-2">
                      <Link href={`/super-admin/order-operations/${o.id}`} className="font-mono text-[12px] text-teal-dark hover:underline">
                        {o.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-charcoal/75">{o.customer?.email?.trim() || "—"}</td>
                    <td className="px-3 py-2 text-[12px] text-charcoal/65">{fmtShort(o.updatedAt)}</td>
                    <td className="px-3 py-2 font-medium">${(o.totalCents / 100).toFixed(2)}</td>
                    <td className="px-3 py-2 text-[11px] font-mono text-charcoal/70">
                      {o.payments.length === 0
                        ? "—"
                        : o.payments.map((p) => `${p.status}:${p.squarePaymentStatus ?? "?"}`).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OperationalCard>

      <OperationalCard title="PaymentRecord failures" meta={`status = failed · page ${pageNum}`}>
        {failedPaymentsPage.length === 0 ? (
          <p className="text-[13px] text-charcoal/62">No failed payment rows indexed from this page.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
              <table className="w-full min-w-[48rem] text-left text-[13px]">
                <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Record</th>
                    <th className="px-3 py-2 font-semibold">Square id</th>
                    <th className="px-3 py-2 font-semibold">commerce order</th>
                    <th className="px-3 py-2 font-semibold">Amount</th>
                    <th className="px-3 py-2 font-semibold">Square status</th>
                    <th className="px-3 py-2 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark/40">
                  {failedPaymentsPage.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2 font-mono text-[11px]">{p.id.slice(0, 8)}…</td>
                      <td className="px-3 py-2 font-mono text-[11px] break-all">{p.squarePaymentId ?? "—"}</td>
                      <td className="px-3 py-2">
                        {p.orderId ? (
                          <Link href={`/super-admin/order-operations/${p.orderId}`} className="text-teal-dark font-semibold text-[12px] hover:underline">
                            {p.orderId.slice(0, 8)}…
                          </Link>
                        ) : (
                          <span className="text-charcoal/45">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">${(p.amountCents / 100).toFixed(2)}</td>
                      <td className="px-3 py-2 font-mono text-[11px]">{p.squarePaymentStatus ?? "—"}</td>
                      <td className="px-3 py-2 text-[12px] text-charcoal/65">{fmtShort(p.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
              {prevPage ? (
                <Link className="text-teal-dark font-semibold hover:underline" href={`?paymentsPage=${prevPage}`}>
                  ← Previous page
                </Link>
              ) : null}
              {hasMoreFailed ? (
                <Link className="text-teal-dark font-semibold hover:underline" href={`?paymentsPage=${nextPage}`}>
                  Next page →
                </Link>
              ) : null}
            </div>
          </>
        )}
      </OperationalCard>

      <OperationalCard
        title="Orphan webhooks (7d)"
        meta={`receipts · ${orphanReceipts.length} rows · ops orphans · ${orphanOpsEvents.length}`}
      >
        <p className="text-[13px] text-charcoal/68 mb-4">
          Delivery receipts with <span className="font-mono">ORPHAN_NO_LOCAL_PAYMENT</span> mirror Square traffic that
          cleared signature checks but could not be matched to <span className="font-mono">payment_records</span>. Use
          Failures inbox recovery or the super-admin reconcile route with a Square payment id.
        </p>
        <OperationalCrossLinks context={orphanDrillIn} className="mb-6" />
        {orphanReceipts.length === 0 && orphanOpsEvents.length === 0 ? (
          <p className="text-[13px] text-charcoal/62">No orphan rows in the trailing week.</p>
        ) : (
          <div className="space-y-6">
            {orphanReceipts.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
                <table className="w-full min-w-[40rem] text-left text-[13px]">
                  <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Receipt</th>
                      <th className="px-3 py-2 font-semibold">Square event id</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">commerce order</th>
                      <th className="px-3 py-2 font-semibold">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-dark/40">
                    {orphanReceipts.map((r) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 font-mono text-[11px] break-all">{r.id}</td>
                        <td className="px-3 py-2 font-mono text-[11px] break-all">{r.externalEventId ?? "—"}</td>
                        <td className="px-3 py-2">
                          <StatusPill variant="degraded">{r.processingStatus}</StatusPill>
                        </td>
                        <td className="px-3 py-2">
                          {r.commerceOrderId ? (
                            <Link
                              href={`/super-admin/order-operations/${r.commerceOrderId}`}
                              className="text-teal-dark font-semibold text-[12px] hover:underline"
                            >
                              {r.commerceOrderId.slice(0, 8)}…
                            </Link>
                          ) : (
                            <span className="text-charcoal/45">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-charcoal/65">{fmtShort(r.receivedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {orphanOpsEvents.length > 0 ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">
                  OperationalActivityEvent orphans (fallback)
                </p>
                <ul className="divide-y divide-cream-dark/40">
                  {orphanOpsEvents.map((row) => {
                    const cid =
                      row.metadata &&
                      typeof row.metadata === "object" &&
                      !Array.isArray(row.metadata) &&
                      (() => {
                        const m = row.metadata as Record<string, unknown>;
                        const ent =
                          m.entities && typeof m.entities === "object" ? (m.entities as Record<string, unknown>) : {};
                        const v =
                          (typeof ent.commerceOrderId === "string" ? ent.commerceOrderId : null) ??
                          (typeof m.commerceOrderId === "string" ? m.commerceOrderId : null);
                        return typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : null;
                      })();
                    const sq = readSquarePaymentIdFromOpsRow(row.metadata);
                    const payHref = sq ? buildSquareDashboardLinks(process.env, { squarePaymentId: sq }).payment : null;
                    return (
                      <li key={row.id} className="py-3 first:pt-0 space-y-1">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="font-mono text-[11px] text-charcoal/55 break-all">{row.type}</span>
                          <span className="text-[11px] text-charcoal/40">{fmtShort(row.createdAt)}</span>
                        </div>
                        <p className="text-[12px] text-charcoal/75">{row.message}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                          {cid ? (
                            <Link href={`/super-admin/order-operations/${cid}`} className="font-semibold text-teal-dark hover:underline">
                              Order shell
                            </Link>
                          ) : null}
                          {payHref && sq ? (
                            <Link href={payHref} className="font-semibold text-teal-dark hover:underline" target="_blank" rel="noreferrer">
                              Square payment ({sq.slice(0, 6)}…)
                            </Link>
                          ) : sq ? (
                            <span className="font-mono text-charcoal/45">{sq}</span>
                          ) : null}
                          <Link
                            href={`/super-admin/operations/failures?subtype=${encodeURIComponent(PLATFORM_EVENT_SUBTYPE.PAYMENT_SQUARE_ORPHAN_WEBHOOK)}&eventId=${encodeURIComponent(row.id)}`}
                            className="font-semibold text-charcoal/60 hover:text-teal-dark"
                          >
                            Open failure
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </OperationalCard>

      <OperationalCard title="Webhook & registration failures (30d snapshot)" meta="OperationalActivityEvent">
        {webhookRows.length === 0 ? (
          <p className="text-[13px] text-charcoal/62 leading-relaxed">No recent rows for configured webhook/order subtypes.</p>
        ) : (
          <ul className="divide-y divide-cream-dark/40">
            {webhookRows.map((row) => {
              let orderHref: string | null = null;
              if (row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)) {
                const m = row.metadata as Record<string, unknown>;
                const entities = typeof m.entities === "object" && m.entities !== null ? (m.entities as Record<string, unknown>) : {};
                const cid =
                  typeof m.commerceOrderId === "string"
                    ? m.commerceOrderId
                    : typeof entities.commerceOrderId === "string"
                      ? entities.commerceOrderId
                      : typeof m.orderId === "string"
                        ? m.orderId
                        : typeof entities.orderId === "string"
                          ? entities.orderId
                          : null;
                if (cid && /^[0-9a-f-]{36}$/i.test(cid)) {
                  orderHref = `/super-admin/order-operations/${cid}`;
                }
              }
              return (
                <li key={row.id} className="py-3 first:pt-0 space-y-1">
                  <div className="flex flex-wrap gap-2 items-center">
                    <StatusPill variant="warning">{row.severity}</StatusPill>
                    <span className="font-mono text-[11px] text-charcoal/55 break-all">{row.type}</span>
                    <span className="text-[11px] text-charcoal/40">{fmtShort(row.createdAt)}</span>
                  </div>
                  <p className="text-[12px] text-charcoal/75">{row.message}</p>
                  {orderHref ? (
                    <Link href={orderHref} className="text-[11px] font-semibold text-teal-dark hover:underline">
                      Deep link · order shell
                    </Link>
                  ) : (
                    <p className="text-[11px] text-charcoal/45 font-mono">id · {row.id}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </OperationalCard>
    </div>
  );
}
