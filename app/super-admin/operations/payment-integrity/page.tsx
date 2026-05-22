import Link from "next/link";

import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import OperationalBreadcrumbs from "@/components/super-admin/operations/OperationalBreadcrumbs";
import OperationalCrossLinks from "@/components/super-admin/operations/OperationalCrossLinks";
import OperationalEscalationBanner from "@/components/super-admin/operations/OperationalEscalationBanner";
import { orphanSquarePaymentOperationalContext } from "@/components/super-admin/operations/operationalIncidentPresets";
import { superAdminCommerceBreadcrumbs } from "@/components/super-admin/operations/superAdminOperationsBreadcrumbs";
import {
  loadPaymentIntegrityReport,
  type PaymentIntegrityCategoryKey,
  type PaymentIntegrityUiSeverity,
} from "@/lib/super-admin/paymentIntegrity/loadPaymentIntegrityReport";

export const dynamic = "force-dynamic";

const RECOVERY_ROUTE = "/api/super-admin/operations/recovery/square-payment-lookup";

function fmtShort(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function categoryTitle(key: PaymentIntegrityCategoryKey): string {
  switch (key) {
    case "stalePendingPaymentOrders":
      return "Stale pending_payment orders";
    case "paidLikeWithoutCompletedPayment":
      return "Paid shells without completed PaymentRecord";
    case "fulfillmentBeforePaymentShell":
      return "Fulfillment ahead of settlement shell";
    case "stalePendingPaymentRecords":
      return "Stale payment_records.pending";
    case "orphanWebhookLinkage":
      return "Orphan Square webhook linkage";
    case "refundLinkageOddities":
      return "Refund case linkage oddities";
    default:
      return key;
  }
}

function worstPaymentIntegritySeverity(byCategory: Record<string, PaymentIntegrityUiSeverity>): PaymentIntegrityUiSeverity {
  const rank: Record<PaymentIntegrityUiSeverity, number> = { INFO: 0, WARNING: 1, HIGH: 2 };
  let worst: PaymentIntegrityUiSeverity = "INFO";
  for (const v of Object.values(byCategory)) {
    if (rank[v] > rank[worst]) worst = v;
  }
  return worst;
}

function severityPillVariant(level: PaymentIntegrityUiSeverity): StatusPillVariant {
  switch (level) {
    case "HIGH":
      return "critical";
    case "WARNING":
      return "warning";
    default:
      return "neutral";
  }
}

function CategorySeverityHeader({
  categoryKey,
  level,
  countLabel,
}: {
  categoryKey: PaymentIntegrityCategoryKey;
  level: PaymentIntegrityUiSeverity;
  countLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">{categoryTitle(categoryKey)}</span>
      <StatusPill variant={severityPillVariant(level)}>{level}</StatusPill>
      <span className="text-[12px] text-charcoal/55">{countLabel}</span>
    </div>
  );
}

export default async function SuperAdminPaymentIntegrityPage() {
  const data = await loadPaymentIntegrityReport();
  const rollupSeverity = worstPaymentIntegritySeverity(data.severityByCategory);
  const orphanContext = orphanSquarePaymentOperationalContext({ page: "payment_integrity" });

  return (
    <div className="space-y-8">
      <OperationalBreadcrumbs segments={superAdminCommerceBreadcrumbs("Payment integrity")} className="-mb-2" />

      <OperationalEscalationBanner severity={rollupSeverity}>
        <p>
          At least one category is in the <span className="font-semibold">HIGH</span> bucket (row-count threshold). Prioritise orphan webhook linkage and stale
          settlement shells before adjusting order status in admin consoles.
        </p>
      </OperationalEscalationBanner>
      <GovPageHeader
        eyebrow="Platform · Operations"
        title="Payment integrity"
        subtitle={`Read-only coordination checks vs local Postgres — snapshot ${fmtShort(data.generatedAt)}. These views do not adjudicate PSP truth; correlate with Square and fulfillment consoles.`}
        actions={
          <>
            <Link
              href="/super-admin/operations/payments"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Payments ops →
            </Link>
            <Link
              href="/super-admin/operations/safety"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Operational safety
            </Link>
          </>
        }
      />

      <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 px-4 py-3 text-[13px] leading-relaxed text-charcoal/80 shadow-sm space-y-2">
        <p>
          <span className="font-semibold text-charcoal">Authority boundary.</span> Square remains the PSP source of truth for money
          movement. This page lists <span className="font-semibold">heuristic drift signals</span> across <span className="font-mono">commerce_orders</span>,{" "}
          <span className="font-mono">payment_records</span>, <span className="font-mono">fulfillment_groups</span>, webhooks, and refund cases —
          intended for internal triage, not reconciliation ledgering.
        </p>
        <p>
          For stuck captures and orphan ingress, pair with{" "}
          <Link href="/super-admin/operations/payments" className="font-semibold text-teal-dark hover:underline">
            Payments operations
          </Link>{" "}
          and the super-admin recovery handler{" "}
          <span className="font-mono text-[12px] text-charcoal/70">
            POST {RECOVERY_ROUTE}
          </span>{" "}
          (authenticated; body per that route — no automatic fixes from this report).
        </p>
        <p className="text-[12px] text-charcoal/65">
          Staleness window: <span className="font-mono">{data.staleHoursConfigured}h</span> via{" "}
          <span className="font-mono">PAYMENT_INTEGRITY_STALE_HOURS</span> (default 24). Orphan receipts: trailing{" "}
          <span className="font-mono">{data.orphanReceiptLookbackDays}d</span>.
        </p>
      </div>

      <p className="text-[13px] text-charcoal/65 -mt-4">
        Section badges reflect row totals: <span className="font-semibold">INFO</span> when zero, <span className="font-semibold">WARNING</span> for{" "}
        1–4 rows, <span className="font-semibold">HIGH</span> for five or more (per category).
      </p>

      <OperationalCard title="Stale pending_payment orders" meta="commerce_orders.updated_at">
        <CategorySeverityHeader
          categoryKey="stalePendingPaymentOrders"
          level={data.severityByCategory.stalePendingPaymentOrders}
          countLabel={`${data.counts.stalePendingPaymentOrders} total · ${data.rows.stalePendingPaymentOrders.length} shown`}
        />
        <p className="text-[13px] text-charcoal/65 mb-3">
          Order shells still in <span className="font-mono">pending_payment</span> with <span className="font-mono">updated_at</span> older than the
          configured window — checkout abandonment vs webhook lag requires manual read.
        </p>
        {data.rows.stalePendingPaymentOrders.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No samples in the capped list.</p>
        ) : (
          <DenseTable>
            <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
              <tr>
                <Th>Order</Th>
                <Th>Email</Th>
                <Th>Stale since</Th>
                <Th>Payments snapshot</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {data.rows.stalePendingPaymentOrders.map((o) => (
                <tr key={o.id}>
                  <Td>
                    <Link className="font-mono text-[12px] text-teal-dark hover:underline" href={`/super-admin/order-operations/${o.id}`}>
                      {o.id.slice(0, 10)}…
                    </Link>
                  </Td>
                  <Td className="text-[12px] text-charcoal/75">{o.customer?.email ?? "—"}</Td>
                  <Td className="text-[12px] text-charcoal/65">{fmtShort(o.updatedAt)}</Td>
                  <Td className="font-mono text-[11px] text-charcoal/70">
                    {o.payments.length === 0 ? "—" : o.payments.map((p) => `${p.status}:${p.squarePaymentStatus ?? "?"}`).join(" · ")}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DenseTable>
        )}
      </OperationalCard>

      <OperationalCard title="Paid / partially_fulfilled without completed payment row" meta="lifecycle mirror">
        <CategorySeverityHeader
          categoryKey="paidLikeWithoutCompletedPayment"
          level={data.severityByCategory.paidLikeWithoutCompletedPayment}
          countLabel={`${data.counts.paidLikeWithoutCompletedPayment} total · ${data.rows.paidLikeWithoutCompletedPayment.length} shown`}
        />
        <p className="text-[13px] text-charcoal/65 mb-3">
          Same family as Operational Safety&apos;s <span className="font-mono">paid</span> heuristic, extended to{" "}
          <span className="font-mono">partially_fulfilled</span> — conservative signal; verify Square before status edits.
        </p>
        {data.rows.paidLikeWithoutCompletedPayment.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">None in preview cap.</p>
        ) : (
          <DenseTable>
            <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
              <tr>
                <Th>Order</Th>
                <Th>Status</Th>
                <Th>Total</Th>
                <Th>Payment snapshot</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {data.rows.paidLikeWithoutCompletedPayment.map((o) => (
                <tr key={o.id}>
                  <Td>
                    <Link className="font-mono text-[12px] text-teal-dark hover:underline" href={`/super-admin/order-operations/${o.id}`}>
                      {o.id.slice(0, 10)}…
                    </Link>
                  </Td>
                  <Td className="font-mono text-[11px]">{o.status}</Td>
                  <Td className="font-medium">${(o.totalCents / 100).toFixed(2)}</Td>
                  <Td className="font-mono text-[11px] text-charcoal/70">{o.payments.map((p) => p.status).join(" · ") || "—"}</Td>
                </tr>
              ))}
            </tbody>
          </DenseTable>
        )}
      </OperationalCard>

      <OperationalCard title="Fulfillment-before-payment (heuristic)" meta="false positives possible">
        <CategorySeverityHeader
          categoryKey="fulfillmentBeforePaymentShell"
          level={data.severityByCategory.fulfillmentBeforePaymentShell}
          countLabel={`${data.counts.fulfillmentBeforePaymentShell} total · ${data.rows.fulfillmentBeforePaymentShell.length} shown`}
        />
        <p className="text-[13px] text-charcoal/65 mb-3">
          <span className="font-mono">draft</span> or <span className="font-mono">pending_payment</span> aggregate rows with any{" "}
          <span className="font-mono">fulfillment_groups</span> status outside <span className="font-mono">pending</span> /{" "}
          <span className="font-mono">cancelled</span>. May include admin rehearsal, backfills, or pipeline races — triage before assuming fraud.
        </p>
        {data.rows.fulfillmentBeforePaymentShell.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No rows flagged.</p>
        ) : (
          <DenseTable>
            <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
              <tr>
                <Th>Order</Th>
                <Th>Order status</Th>
                <Th>Groups</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {data.rows.fulfillmentBeforePaymentShell.map((o) => (
                <tr key={o.id}>
                  <Td>
                    <Link className="font-mono text-[12px] text-teal-dark hover:underline" href={`/super-admin/order-operations/${o.id}`}>
                      {o.id.slice(0, 10)}…
                    </Link>
                  </Td>
                  <Td className="font-mono text-[11px]">{o.status}</Td>
                  <Td className="font-mono text-[11px] text-charcoal/70">
                    {o.fulfillmentGroups.map((g) => `${g.pipeline}:${g.status}`).join(" | ")}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DenseTable>
        )}
      </OperationalCard>

      <OperationalCard title="Stale payment_records.pending" meta="PSP mirror lag">
        <CategorySeverityHeader
          categoryKey="stalePendingPaymentRecords"
          level={data.severityByCategory.stalePendingPaymentRecords}
          countLabel={`${data.counts.stalePendingPaymentRecords} total · ${data.rows.stalePendingPaymentRecords.length} shown`}
        />
        <p className="text-[13px] text-charcoal/65 mb-3">
          Local rows stuck in <span className="font-mono">pending</span> with a quiet <span className="font-mono">updated_at</span> — compare to Square payment state.
        </p>
        {data.rows.stalePendingPaymentRecords.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No stale pending rows in sample.</p>
        ) : (
          <DenseTable>
            <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
              <tr>
                <Th>Record</Th>
                <Th>Order</Th>
                <Th>Square payment</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {data.rows.stalePendingPaymentRecords.map((p) => (
                <tr key={p.id}>
                  <Td className="font-mono text-[11px]">{p.id.slice(0, 10)}…</Td>
                  <Td>
                    {p.orderId ? (
                      <Link className="text-teal-dark font-semibold text-[12px] hover:underline" href={`/super-admin/order-operations/${p.orderId}`}>
                        {p.orderId.slice(0, 8)}…
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td className="font-mono text-[11px] break-all">{p.squarePaymentId ?? "—"}</Td>
                  <Td className="text-[12px] text-charcoal/65">{fmtShort(p.updatedAt)}</Td>
                </tr>
              ))}
            </tbody>
          </DenseTable>
        )}
      </OperationalCard>

      <OperationalCard title="Orphan webhook linkage" meta={`square · ${data.orphanReceiptLookbackDays}d`}>
        <CategorySeverityHeader
          categoryKey="orphanWebhookLinkage"
          level={data.severityByCategory.orphanWebhookLinkage}
          countLabel={`receipts ${data.counts.squareOrphanWebhookReceipts} · ops events ${data.counts.orphanOperationalActivityEvents}`}
        />
        <p className="text-[13px] text-charcoal/65 mb-3">
          Failed / tagged <span className="font-mono">ORPHAN_NO_LOCAL_PAYMENT</span> receipts plus recent{" "}
          <span className="font-mono">payment.square.orphan_webhook</span> activity events — mirrors the reconciliation path without invoking it.
        </p>

        <OperationalCrossLinks context={orphanContext} className="mb-6" />

        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">WebhookDeliveryReceipt</p>
        {data.rows.squareOrphanWebhookReceipts.length === 0 ? (
          <p className="text-[13px] text-charcoal/60 mb-6">No orphan-coded Square receipts in window.</p>
        ) : (
          <DenseTable>
            <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
              <tr>
                <Th>Receipt</Th>
                <Th>Order</Th>
                <Th>Status</Th>
                <Th>Received</Th>
                <Th>Error</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {data.rows.squareOrphanWebhookReceipts.map((r) => (
                <tr key={r.id}>
                  <Td className="font-mono text-[11px] break-all">{r.id.slice(0, 12)}…</Td>
                  <Td>
                    {r.commerceOrderId ? (
                      <Link className="text-teal-dark font-semibold text-[12px] hover:underline" href={`/super-admin/order-operations/${r.commerceOrderId}`}>
                        {r.commerceOrderId.slice(0, 8)}…
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td className="font-mono text-[11px]">{r.processingStatus}</Td>
                  <Td className="text-[12px] text-charcoal/65">{fmtShort(r.receivedAt)}</Td>
                  <Td className="font-mono text-[11px]">{r.errorCode ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </DenseTable>
        )}

        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2 mt-8">OperationalActivityEvent · orphan fallback</p>
        {data.rows.orphanOperationalActivityEvents.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No recent orphan webhook events.</p>
        ) : (
          <ul className="divide-y divide-cream-dark/40 border border-cream-dark/45 rounded-lg">
            {data.rows.orphanOperationalActivityEvents.map((ev) => (
              <li key={ev.id} className="px-3 py-3 space-y-1">
                <div className="flex flex-wrap gap-2 items-center">
                  <StatusPill variant="degraded">{ev.severity}</StatusPill>
                  <span className="font-mono text-[11px] text-charcoal/55">{ev.type}</span>
                  <span className="text-[11px] text-charcoal/40">{fmtShort(ev.createdAt)}</span>
                </div>
                <p className="text-[12px] text-charcoal/75">{ev.message}</p>
                <Link
                  href={`/super-admin/operations/failures?eventId=${encodeURIComponent(ev.id)}`}
                  className="text-[11px] font-semibold text-teal-dark hover:underline"
                >
                  Open failures inbox
                </Link>
              </li>
            ))}
          </ul>
        )}
      </OperationalCard>

      <OperationalCard title="Refund linkage oddities" meta="OperationalRefundCase">
        <CategorySeverityHeader
          categoryKey="refundLinkageOddities"
          level={data.severityByCategory.refundLinkageOddities}
          countLabel={`${data.counts.refundLinkageOddities} total · ${data.rows.refundLinkageOddities.length} shown`}
        />
        <p className="text-[13px] text-charcoal/65 mb-3">
          Cases in <span className="font-mono">APPROVED</span> / <span className="font-mono">SUBMITTED_TO_SQUARE</span> missing a payment row linkage or pointing at a payment tied to a different order shell.
        </p>
        {data.rows.refundLinkageOddities.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No odd linkages scanned.</p>
        ) : (
          <DenseTable>
            <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
              <tr>
                <Th>Case</Th>
                <Th>Status</Th>
                <Th>Commerce order</Th>
                <Th>Issue</Th>
                <Th>Payment order</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {data.rows.refundLinkageOddities.map((r) => (
                <tr key={r.id}>
                  <Td className="font-mono text-[11px]">{r.id.slice(0, 10)}…</Td>
                  <Td className="font-mono text-[11px]">{r.status}</Td>
                  <Td>
                    <Link
                      className="text-teal-dark font-semibold text-[12px] hover:underline"
                      href={`/super-admin/order-operations/${r.commerceOrderId}`}
                    >
                      {r.commerceOrderId.slice(0, 8)}…
                    </Link>
                  </Td>
                  <Td className="font-mono text-[11px]">{r.reasonTag}</Td>
                  <Td className="font-mono text-[11px]">
                    {r.linkedOrderId ? (
                      <Link className="text-teal-dark hover:underline" href={`/super-admin/order-operations/${r.linkedOrderId}`}>
                        {r.linkedOrderId.slice(0, 8)}…
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DenseTable>
        )}
      </OperationalCard>
    </div>
  );
}

function DenseTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
      <table className="w-full min-w-[40rem] text-left text-[13px]">{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-semibold">{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
