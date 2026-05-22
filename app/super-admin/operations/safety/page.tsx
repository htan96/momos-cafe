import Link from "next/link";
import type { WebhookProcessingStatus } from "@prisma/client";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import OperationalBreadcrumbs from "@/components/super-admin/operations/OperationalBreadcrumbs";
import OperationalCrossLinks from "@/components/super-admin/operations/OperationalCrossLinks";
import { operationalSafetyIncidentContext } from "@/components/super-admin/operations/operationalIncidentPresets";
import { superAdminOperationsBreadcrumbs } from "@/components/super-admin/operations/superAdminOperationsBreadcrumbs";
import {
  loadOperationalSafetyDashboard,
  readNotificationOutboxAttempts,
  SAFETY_NOTIFICATION_STUCK_HOURS,
  SAFETY_PAYMENT_PENDING_STALE_HOURS,
  SAFETY_PENDING_PAYMENT_STALE_HOURS,
  type OperationalSafetySeverity,
} from "@/lib/super-admin/operationalSafety/loadOperationalSafetyDashboard";
import {
  OPERATOR_QUARANTINE_CONCEPT_NOTE,
  loadContainmentOperationalSignals,
  type ContainmentOperationalPayload,
  type ContainmentRecommendation,
} from "@/lib/operations/containment";
import { loadLifecycleIntegrityReport } from "@/lib/super-admin/lifecycleIntegrity/loadLifecycleIntegrityReport";

export const dynamic = "force-dynamic";

function fmtShort(iso: Date): string {
  return iso.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function severityBadgeVariant(level: OperationalSafetySeverity): StatusPillVariant {
  switch (level) {
    case "CRITICAL":
      return "critical";
    case "HIGH":
      return "warning";
    case "WARNING":
      return "neutral";
    default:
      return "neutral";
  }
}

function webhookPill(stat: WebhookProcessingStatus): StatusPillVariant {
  switch (stat) {
    case "failed":
      return "degraded";
    case "ignored":
      return "neutral";
    default:
      return "neutral";
  }
}

export default async function SuperAdminOperationalSafetyPage() {
  const snapshotAt = new Date();
  const [data, lifecycleReport] = await Promise.all([
    loadOperationalSafetyDashboard(),
    loadLifecycleIntegrityReport(),
  ]);
  const containment = await loadContainmentOperationalSignals({
    now: snapshotAt,
    lifecycleReport,
  });

  const sessLike = data.webhooks.distinctProvidersInLookback.some((p) => /ses/i.test(p.trim()));
  const safetyContext = operationalSafetyIncidentContext();

  return (
    <div className="space-y-8">
      <OperationalBreadcrumbs segments={superAdminOperationsBreadcrumbs("Operational safety")} className="-mb-2" />

      <GovPageHeader
        eyebrow="Platform · Operations"
        title="Operational safety"
        subtitle={`Read-only cross-signal diagnostics — Postgres + governance only. Snapshot ${fmtShort(new Date(data.generatedAt))}. Heuristics are conservative; escalate via payments / failures / order operations.`}
        actions={
          <>
            <Link
              href="/super-admin/operations/payments"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Payments ops
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

      <OperationalCrossLinks context={safetyContext} />

      <ContainmentSignalsSection escalation={containment.escalation} meta={containment.meta} />

      <OperationalCard
        title="Severity summary"
        meta="aggregated prisma counts · ordinal buckets"
      >
        <p className="text-[13px] text-charcoal/70 mb-4">
          Bands weight revenue / webhook delivery risk (HIGH) vs reconciliation drift / governance stance (WARNING) vs benign ignored webhooks (INFO). CRITICAL rows focus on mismatched PSP vs order-shell truth.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(["CRITICAL", "HIGH", "WARNING", "INFO"] as const).map((sev) => (
            <div key={sev} className="rounded-lg border border-cream-dark/55 bg-white/90 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <StatusPill variant={severityBadgeVariant(sev)}>{sev}</StatusPill>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-charcoal">{data.summary[sev]}</p>
              <p className="text-[11px] uppercase tracking-[0.1em] text-charcoal/45 mt-2">Rolling metrics</p>
            </div>
          ))}
        </div>
      </OperationalCard>

      <OperationalCard title="Payments & reconciliation" meta="WebhookDeliveryReceipt · PaymentRecord · CommerceOrder">
        <div className="space-y-6">
          <p className="text-[13px] text-charcoal/70">
            Pending-payment staleness cutoff <span className="font-mono">{SAFETY_PENDING_PAYMENT_STALE_HOURS}h</span> uses{" "}
            <span className="font-semibold">order.updated_at</span>. PSP row staleness cutoff{" "}
            <span className="font-mono">{SAFETY_PAYMENT_PENDING_STALE_HOURS}h</span> uses{" "}
            <span className="font-semibold">payment_records.updated_at</span>.
          </p>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">
              Square webhook receipts · failed ({data.payments.squareFailedReceipts.length} shown · recent first)
            </p>
            {data.payments.squareFailedReceipts.length === 0 ? (
              <p className="text-[13px] text-charcoal/60">None indexed.</p>
            ) : (
              <DenseTable>
                <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                  <tr>
                    <Th>Receipt</Th>
                    <Th>Commerce order</Th>
                    <Th>Payment record</Th>
                    <Th>Received</Th>
                    <Th>Error</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark/40">
                  {data.payments.squareFailedReceipts.map((r) => (
                    <tr key={r.id}>
                      <Td className="font-mono text-[11px] break-all">{r.id.slice(0, 12)}…</Td>
                      <Td>
                        {r.commerceOrderId ? (
                          <Link className="text-teal-dark font-semibold hover:underline" href={`/super-admin/order-operations/${r.commerceOrderId}`}>
                            {r.commerceOrderId.slice(0, 8)}…
                          </Link>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td>
                        {r.paymentRecordId ? (
                          <span className="font-mono text-[11px]">{r.paymentRecordId.slice(0, 8)}…</span>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td className="text-[12px] text-charcoal/65">{fmtShort(r.receivedAt)}</Td>
                      <Td className="font-mono text-[11px] text-charcoal/70">{r.errorCode ?? "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </DenseTable>
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">
              Stale <span className="font-mono">payment_records.pending</span> ({data.payments.stalePendingPaymentRecords.length})
            </p>
            {data.payments.stalePendingPaymentRecords.length === 0 ? (
              <p className="text-[13px] text-charcoal/60">No stale pending rows.</p>
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
                  {data.payments.stalePendingPaymentRecords.map((p) => (
                    <tr key={p.id}>
                      <Td className="font-mono text-[11px]">{p.id.slice(0, 10)}…</Td>
                      <Td>
                        {p.orderId ? (
                          <Link className="text-teal-dark font-semibold hover:underline" href={`/super-admin/order-operations/${p.orderId}`}>
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
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">
              Stale <span className="font-mono">pending_payment</span> shells ({data.payments.stalePendingPaymentOrders.length})
            </p>
            {data.payments.stalePendingPaymentOrders.length === 0 ? (
              <p className="text-[13px] text-charcoal/60">Nothing older than freshness window.</p>
            ) : (
              <DenseTable>
                <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                  <tr>
                    <Th>Order</Th>
                    <Th>Guest / email</Th>
                    <Th>Stale since</Th>
                    <Th>Payments snapshot</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark/40">
                  {data.payments.stalePendingPaymentOrders.map((o) => (
                    <tr key={o.id}>
                      <Td>
                        <Link className="font-mono text-[12px] text-teal-dark hover:underline" href={`/super-admin/order-operations/${o.id}`}>
                          {o.id.slice(0, 10)}…
                        </Link>
                      </Td>
                      <Td className="text-[12px] text-charcoal/75">{o.customer?.email ?? "—"}</Td>
                      <Td className="text-[12px]">{fmtShort(o.updatedAt)}</Td>
                      <Td className="font-mono text-[11px] text-charcoal/70">
                        {o.payments.length === 0 ? "—" : o.payments.map((pr) => `${pr.status}:${pr.squarePaymentStatus ?? "?"}`).join(" · ")}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </DenseTable>
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">
              <span className="font-mono">pending_payment</span> shells with PSP <span className="font-mono">completed</span> rows ({data.payments.pendingPaymentWithCompletedRecord.length} · capped)
            </p>
            {data.payments.pendingPaymentWithCompletedRecord.length === 0 ? (
              <p className="text-[13px] text-charcoal/60">No mismatches detected.</p>
            ) : (
              <DenseTable>
                <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                  <tr>
                    <Th>Order</Th>
                    <Th>Payments</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark/40">
                  {data.payments.pendingPaymentWithCompletedRecord.map((o) => (
                    <tr key={o.id}>
                      <Td>
                        <Link className="font-mono text-teal-dark hover:underline text-[12px]" href={`/super-admin/order-operations/${o.id}`}>
                          {o.id.slice(0, 10)}…
                        </Link>
                      </Td>
                      <Td className="font-mono text-[11px] text-charcoal/70">{o.payments.map((pr) => `${pr.status}`).join(" · ")}</Td>
                    </tr>
                  ))}
                </tbody>
              </DenseTable>
            )}
          </div>
        </div>
      </OperationalCard>

      <OperationalCard
        title="Webhooks"
        meta={`${data.webhooks.lookbackDays}-day receipt window`}
      >
        <p className="text-[13px] text-charcoal/70 mb-4">
          Square + Shippo aggregates below. SES rows only appear once inbound mail stores them — currently{" "}
          {sessLike ? (
            <span className="font-semibold text-charcoal">SES-like provider receipts observed in-window.</span>
          ) : (
            <span className="font-semibold text-charcoal">
              no SES-labelled provider surfaced in Postgres <span className="font-normal">(Resend inbound uses </span>
              <span className="font-mono">provider=resend</span>
              <span className="font-normal">).</span>
            </span>
          )}
        </p>

        <div className="overflow-x-auto rounded-lg border border-cream-dark/50 mb-6">
          <table className="w-full min-w-[36rem] text-left text-[13px]">
            <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
              <tr>
                <th className="px-3 py-2 font-semibold">Provider</th>
                <th className="px-3 py-2 font-semibold">Failed</th>
                <th className="px-3 py-2 font-semibold">Ignored</th>
                <th className="px-3 py-2 font-semibold">Accepted</th>
                <th className="px-3 py-2 font-semibold">Processed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {data.webhooks.providerRollups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-charcoal/60">
                    No square/shippo receipts in-window.
                  </td>
                </tr>
              ) : (
                data.webhooks.providerRollups.map((r) => (
                  <tr key={r.provider}>
                    <td className="px-3 py-2 font-mono text-[12px]">{r.provider}</td>
                    <td className="px-3 py-2">{r.failed}</td>
                    <td className="px-3 py-2">{r.ignored}</td>
                    <td className="px-3 py-2">{r.accepted}</td>
                    <td className="px-3 py-2">{r.processed}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Recent failed / ignored (square · shippo)</p>
        {data.webhooks.recentProblemReceipts.length === 0 ? (
          <p className="text-[13px] text-charcoal/60 mb-4">Quiet window.</p>
        ) : (
          <DenseTable>
            <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
              <tr>
                <Th>Provider</Th>
                <Th>Status</Th>
                <Th>Order</Th>
                <Th>Received</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {data.webhooks.recentProblemReceipts.map((r) => (
                <tr key={r.id}>
                  <Td className="font-mono text-[11px]">{r.provider}</Td>
                  <Td>
                    <StatusPill variant={webhookPill(r.processingStatus)}>{r.processingStatus}</StatusPill>
                  </Td>
                  <Td>
                    {r.commerceOrderId ? (
                      <Link className="text-teal-dark hover:underline text-[12px] font-semibold" href={`/super-admin/order-operations/${r.commerceOrderId}`}>
                        link
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td className="text-[12px] text-charcoal/65">{fmtShort(r.receivedAt)}</Td>
                </tr>
              ))}
            </tbody>
          </DenseTable>
        )}

        <p className="text-[11px] text-charcoal/50 mt-3">
          Distinct providers in-window:{" "}
          <span className="font-mono text-[11px] text-charcoal/70">{data.webhooks.distinctProvidersInLookback.join(", ") || "—"}</span>
        </p>
      </OperationalCard>

      <OperationalCard title="Notifications" meta="NotificationEvent · outbox JSON">
        <p className="text-[13px] text-charcoal/70 mb-4">
          Stuck rows = <span className="font-mono">processed_at IS NULL</span>{" "}
          <span className="font-semibold">and created_at older than {SAFETY_NOTIFICATION_STUCK_HOURS}h.</span>
        </p>
        <div className="rounded-lg border border-cream-dark/50 bg-white/85 px-3 py-2 text-[13px] mb-4">
          Total stuck (count):{" "}
          <span className="font-semibold">{data.notifications.stuckCount}</span>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Stuck backlog (FIFO sample)</p>
        {data.notifications.stuckRows.length === 0 ? (
          <p className="text-[13px] text-charcoal/60 mb-8">Nothing stuck past horizon.</p>
        ) : (
          <DenseTable>
            <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
              <tr>
                <Th>Type</Th>
                <Th>Attempts</Th>
                <Th>Lease</Th>
                <Th>Queued</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {data.notifications.stuckRows.map((n) => {
                const tries = readNotificationOutboxAttempts(n.payload);
                return (
                  <tr key={n.id}>
                    <Td className="font-mono text-[11px] break-all">{n.type}</Td>
                    <Td className="font-mono text-[11px]">{tries != null ? tries : "—"}</Td>
                    <Td className="text-[11px] text-charcoal/65">{n.startedProcessingAt ? fmtShort(n.startedProcessingAt) : "—"}</Td>
                    <Td className="text-[12px]">{fmtShort(n.createdAt)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </DenseTable>
        )}

        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2 mt-6">
          Recent rows · type matches <span className="italic font-normal lowercase">failed</span>/<span className="italic lowercase">delivery</span>
        </p>
        {data.notifications.recentFailureOrDeliveryTypes.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">None.</p>
        ) : (
          <DenseTable>
            <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
              <tr>
                <Th>Type</Th>
                <Th>Attempts</Th>
                <Th>Processed</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {data.notifications.recentFailureOrDeliveryTypes.map((n) => {
                const tries = readNotificationOutboxAttempts(n.payload);
                return (
                  <tr key={n.id}>
                    <Td className="font-mono text-[11px] break-all">{n.type}</Td>
                    <Td className="font-mono text-[11px]">{tries != null ? tries : "—"}</Td>
                    <Td className="text-[12px] text-charcoal/65">{n.processedAt ? fmtShort(n.processedAt) : "—"}</Td>
                    <Td className="text-[12px]">{fmtShort(n.createdAt)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </DenseTable>
        )}
      </OperationalCard>

      <OperationalCard title="Lifecycle drift (possible)" meta="bounded list · manual validation required">
        <p className="text-[13px] text-charcoal/70 mb-4">
          Heuristics only — cardinality capped at thirty per category. Correlate against Square dashboard + fulfillment consoles before remediation.
        </p>

        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">
          <span className="font-mono">paid</span> without <span className="font-mono">completed</span> PaymentRecord · count {data.aggregation.paidWithoutCompletedPayment}
        </p>
        {data.lifecycleDrift.paidWithoutCompletedPayment.length === 0 ? (
          <p className="text-[13px] text-charcoal/60 mb-6">None in preview window.</p>
        ) : (
          <DenseTable>
            <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
              <tr>
                <Th>Order</Th>
                <Th>Total</Th>
                <Th>Payment snapshot</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {data.lifecycleDrift.paidWithoutCompletedPayment.map((o) => (
                <tr key={o.id}>
                  <Td>
                    <Link className="font-mono text-teal-dark hover:underline text-[12px]" href={`/super-admin/order-operations/${o.id}`}>
                      {o.id.slice(0, 12)}…
                    </Link>
                  </Td>
                  <Td className="font-medium">${(o.totalCents / 100).toFixed(2)}</Td>
                  <Td className="font-mono text-[11px] text-charcoal/70">{o.payments.map((p) => p.status).join(" · ") || "—"}</Td>
                </tr>
              ))}
            </tbody>
          </DenseTable>
        )}

        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2 mt-8">
          <span className="font-mono">fulfilled</span> · non-terminal fulfillment groups · count {data.aggregation.fulfillmentDriftFulfilled}
        </p>
        {data.lifecycleDrift.fulfilledWithActiveGroups.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No shells flagged.</p>
        ) : (
          <DenseTable>
            <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
              <tr>
                <Th>Order</Th>
                <Th>Groups</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {data.lifecycleDrift.fulfilledWithActiveGroups.map((o) => (
                <tr key={o.id}>
                  <Td>
                    <Link className="font-mono text-teal-dark hover:underline text-[12px]" href={`/super-admin/order-operations/${o.id}`}>
                      {o.id.slice(0, 12)}…
                    </Link>
                  </Td>
                  <Td className="font-mono text-[11px] text-charcoal/70">
                    {o.fulfillmentGroups.map((g) => `${g.pipeline}:${g.status}`).join(" | ")}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DenseTable>
        )}
      </OperationalCard>

      <OperationalCard title="Governance & platform flags" meta="PlatformGovernanceControl · PlatformFeatureToggle">
        <p className="text-[13px] text-charcoal/70 mb-4">
          Kill switches feed severity WARNING totals when restrictive controls are toggled ON. Operational notifications governance includes the notifications platform feature.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Operational controls</p>
            <ul className="space-y-2 text-[13px]">
              {data.governance.controls.map((c) => (
                <li key={c.key} className="flex flex-wrap items-center gap-2">
                  <StatusPill variant={c.enabled ? "warning" : "neutral"}>{c.enabled ? "on" : "off"}</StatusPill>
                  <span className="font-medium text-charcoal">{c.title}</span>
                  <span className="font-mono text-[11px] text-charcoal/45">{c.key}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Platform feature toggles</p>
            <ul className="space-y-2 text-[13px]">
              {data.governance.platformFeatures.map((f) => (
                <li key={f.key} className="flex flex-wrap items-center gap-2">
                  <StatusPill variant={f.enabled ? "neutral" : "warning"}>{f.enabled ? "enabled" : "disabled"}</StatusPill>
                  <span className="font-medium text-charcoal">{f.title}</span>
                  <span className="font-mono text-[11px] text-charcoal/45">{f.key}</span>
                  {f.key === "notifications" && !f.enabled ? (
                    <span className="text-[11px] text-charcoal/50">(notifications rail off)</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <Link
              href="/super-admin/platform/feature-controls"
              className="inline-block mt-4 text-[12px] font-semibold text-teal-dark hover:underline"
            >
              Feature controls workspace →
            </Link>
          </div>
        </div>
      </OperationalCard>
    </div>
  );
}

function ContainmentSignalsSection({
  escalation,
  meta,
}: {
  escalation: ContainmentRecommendation[];
  meta: ContainmentOperationalPayload["meta"];
}) {
  const tiers = ["CRITICAL", "HIGH", "WARNING", "INFO"] as const;
  const grouped = tiers.map((sev) => ({
    severity: sev,
    rows: escalation.filter((r) => r.severity === sev),
  }));

  return (
    <OperationalCard
      title="Containment readiness (signals)"
      meta={`${meta.lifecycleFindingsConsidered} lifecycle rows · webhook replay window ${meta.webhookReplayWindowDays}d`}
    >
      <div className="rounded-lg border border-amber-200/90 bg-amber-50/80 px-3 py-2.5 text-[13px] text-charcoal/85 mb-4">
        <p className="font-semibold text-charcoal mb-1">Recommendations only — no automated enforcement</p>
        <p className="text-charcoal/75">
          {OPERATOR_QUARANTINE_CONCEPT_NOTE} Architecture:{" "}
          <span className="font-mono text-[11px]">docs/architecture/operational-containment-signals.md</span>
        </p>
      </div>

      <p className="text-[13px] text-charcoal/70 mb-4">
        Escalation-ordered rollup from lifecycle integrity scans, notification health aggregates, webhook replay audit
        fingerprints, and active failure triage pressure. Humans decide any platform-level pause or corrective action via
        existing ops routes.
      </p>

      {escalation.length === 0 ? (
        <p className="text-[13px] text-charcoal/65">
          No mapped containment cues for this snapshot (no lifecycle rows hit mapped severe codes / notification aggregates
          below thresholds / webhook receipt repeat floor / triage backlog floor).
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ severity, rows }) =>
            rows.length === 0 ? null : (
              <div key={severity}>
                <div className="flex items-center gap-2 mb-2">
                  <StatusPill variant={severityBadgeVariant(severity)}>{severity}</StatusPill>
                  <span className="text-[11px] uppercase tracking-[0.12em] text-charcoal/45">
                    {rows.length} signal group{rows.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="space-y-4">
                  {rows.map((r) => (
                    <li
                      key={r.kind}
                      className="rounded-lg border border-cream-dark/50 bg-white/85 px-3 py-3 shadow-sm"
                    >
                      <p className="font-mono text-[11px] text-charcoal/55 mb-1">{r.kind}</p>
                      <ul className="list-disc ml-5 text-[13px] text-charcoal/80 space-y-1 mb-3">
                        {r.rationale.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45 mb-1">
                        Suggested operator actions
                      </p>
                      <ul className="list-disc ml-5 text-[12px] text-charcoal/75 space-y-0.5 mb-3">
                        {r.suggestedOperatorActions.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45 mb-1">Links</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {r.relatedDashboardLinks.map((href) =>
                          href.startsWith("/") ? (
                            <Link
                              key={href}
                              href={href}
                              className="text-[12px] font-semibold text-teal-dark hover:underline"
                            >
                              {href}
                            </Link>
                          ) : (
                            <span key={href} className="font-mono text-[11px] text-charcoal/60" title="Repo path">
                              {href}
                            </span>
                          )
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </div>
      )}
    </OperationalCard>
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
