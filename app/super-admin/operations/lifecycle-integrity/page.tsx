import type { ReactNode } from "react";
import Link from "next/link";

import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import OperationalBreadcrumbs from "@/components/super-admin/operations/OperationalBreadcrumbs";
import OperationalCrossLinks from "@/components/super-admin/operations/OperationalCrossLinks";
import OperationalEscalationBanner from "@/components/super-admin/operations/OperationalEscalationBanner";
import { lifecycleIntegrityIncidentContext } from "@/components/super-admin/operations/operationalIncidentPresets";
import { superAdminOperationsBreadcrumbs } from "@/components/super-admin/operations/superAdminOperationsBreadcrumbs";
import type { LifecycleIntegrityEntityRefs, LifecycleIntegritySeverity } from "@/lib/commerce/lifecycleIntegrity/types";
import { lifecycleFindingDedupeKey, loadLifecycleIntegrityReport } from "@/lib/super-admin/lifecycleIntegrity/loadLifecycleIntegrityReport";

export const dynamic = "force-dynamic";

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function severityPillVariant(s: LifecycleIntegritySeverity): StatusPillVariant {
  switch (s) {
    case "CRITICAL":
      return "critical";
    case "HIGH":
      return "warning";
    case "WARNING":
      return "degraded";
    default:
      return "neutral";
  }
}

function worstPillVariant(s: LifecycleIntegritySeverity | "NONE"): StatusPillVariant {
  if (s === "NONE") return "ok";
  return severityPillVariant(s);
}

function EntityRefLinks({ refs }: { refs: LifecycleIntegrityEntityRefs }) {
  const parts: ReactNode[] = [];
  const push = (label: string, href: string, id: string) => {
    parts.push(
      <span key={label} className="inline-flex gap-1 items-center mr-3">
        <span className="text-charcoal/45">{label}</span>
        <Link className="font-mono text-[11px] text-teal-dark hover:underline" href={href}>
          {id.slice(0, 8)}…
        </Link>
      </span>
    );
  };

  if (refs.commerceOrderId) push("order", `/super-admin/order-operations/${refs.commerceOrderId}`, refs.commerceOrderId);
  if (refs.paymentRecordId) {
    parts.push(
      <span key="pay" className="inline-flex gap-1 items-center mr-3">
        <span className="text-charcoal/45">payment</span>
        <span className="font-mono text-[11px] text-charcoal/70">{refs.paymentRecordId.slice(0, 8)}…</span>
      </span>
    );
  }
  if (refs.fulfillmentGroupId) {
    parts.push(
      <span key="fg" className="inline-flex gap-1 items-center mr-3">
        <span className="text-charcoal/45">fulfillment</span>
        <span className="font-mono text-[11px] text-charcoal/70">{refs.fulfillmentGroupId.slice(0, 8)}…</span>
      </span>
    );
  }
  if (refs.shipmentId) {
    parts.push(
      <span key="ship" className="inline-flex gap-1 items-center mr-3">
        <span className="text-charcoal/45">shipment</span>
        <span className="font-mono text-[11px] text-charcoal/70">{refs.shipmentId.slice(0, 8)}…</span>
      </span>
    );
  }
  if (refs.refundCaseId) {
    parts.push(
      <span key="refund" className="inline-flex gap-1 items-center mr-3">
        <span className="text-charcoal/45">refund</span>
        <span className="font-mono text-[11px] text-charcoal/70">{refs.refundCaseId.slice(0, 8)}…</span>
      </span>
    );
  }
  if (refs.notificationId) {
    parts.push(
      <span key="nev" className="inline-flex gap-1 items-center mr-3">
        <span className="text-charcoal/45">notification</span>
        <span className="font-mono text-[11px] text-charcoal/70">{refs.notificationId.slice(0, 8)}…</span>
      </span>
    );
  }

  if (parts.length === 0) return <span className="text-charcoal/55">—</span>;
  return <div className="flex flex-wrap gap-y-1">{parts}</div>;
}

export default async function SuperAdminLifecycleIntegrityPage() {
  const data = await loadLifecycleIntegrityReport();
  const lifecycleContext = lifecycleIntegrityIncidentContext();
  const rollupSeverity = data.worstSeverity === "NONE" ? null : data.worstSeverity;

  return (
    <div className="space-y-8">
      <OperationalBreadcrumbs segments={superAdminOperationsBreadcrumbs("Lifecycle integrity")} className="-mb-2" />

      <OperationalEscalationBanner severity={rollupSeverity} title="Coordination escalation">
        <p>
          Worst-case ordinal finding bucket is <span className="font-semibold">{data.worstSeverity}</span>. Treat coordinated payment / shipment mismatches as
          higher urgency than lone INFO rows.
        </p>
      </OperationalEscalationBanner>
      <GovPageHeader
        eyebrow="Platform · Operations"
        title="Commerce lifecycle integrity"
        subtitle={`Cross-surface read-only scan — snapshot ${fmtShort(data.generatedAt)}. Samples and caps preserve database safety; correlate with PSP, carrier tools, and outbox dashboards before acting.`}
        actions={
          <>
            <Link
              href="/super-admin/operations/payment-integrity"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Payment integrity →
            </Link>
            <Link
              href="/super-admin/operations/readiness"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Readiness →
            </Link>
            <Link
              href="/super-admin/operations/safety"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Operational safety →
            </Link>
          </>
        }
      />

      <OperationalCrossLinks context={lifecycleContext} />

      <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 px-4 py-3 text-[13px] leading-relaxed text-charcoal/80 shadow-sm space-y-2">
        <p>
          <span className="font-semibold text-charcoal">Visibility only — no auto-fix.</span> This dashboard{" "}
          <span className="font-semibold">does not</span> reconcile webhooks, mutate orders, drain notifications, or rewind fulfillment. Pair signals with focused
          operations consoles and manual playbooks.
        </p>
        <p className="text-[12px] text-charcoal/65">
          Stale pending-payment horizon matches payment integrity:&nbsp;
          <span className="font-mono">{data.stalePendingHoursConfigured}h</span> via{" "}
          <span className="font-mono">PAYMENT_INTEGRITY_STALE_HOURS</span>.
        </p>
      </div>

      <details className="rounded-xl border border-teal-dark/20 bg-white/90 px-4 py-3 shadow-sm">
        <summary className="cursor-pointer text-[14px] font-semibold text-charcoal marker:text-charcoal">
          Authority & dependencies
          <span className="text-[12px] font-normal text-charcoal/55"> · static map + finding overlays</span>
        </summary>
        <div className="mt-3 space-y-3 text-[13px] text-charcoal/75 leading-relaxed border-t border-cream-dark/45 pt-3">
          <p>
            Lifecycle integrity rows now include optional <span className="font-mono">authorityDomain</span> /{" "}
            <span className="font-mono">authorityNote</span> for explainability. Full source-of-truth table lives in the repo at{" "}
            <span className="font-mono text-[12px] text-charcoal">{data.authorityMap.docRelativePath}</span> (open from your checkout — not a web route).
          </p>
          <p className="text-[12px] text-charcoal/60">
            Dependency graph edges (validation narrative):{" "}
            <span className="font-semibold text-charcoal/70">{data.authorityMap.dependencyEdgeCount}</span> documented links in{" "}
            <span className="font-mono">lifecycleAuthorityGraph.ts</span>.
          </p>
          <div>
            <p className="text-[11px] uppercase tracking-[0.1em] text-charcoal/45 mb-1.5">Summary</p>
            <ul className="list-disc pl-5 space-y-1">
              {data.authorityMap.summaryBullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.1em] text-charcoal/45 mb-1.5">
              Surface classification counts (heuristic on finding categories)
            </p>
            <div className="flex flex-wrap gap-2 text-[12px] font-mono">
              {(
                Object.entries(data.authorityMap.integritySurfaceClassificationCounts) as Array<
                  [keyof typeof data.authorityMap.integritySurfaceClassificationCounts, number]
                >
              ).map(([k, n]) => (
                <span key={k} className="rounded-md border border-cream-dark/50 bg-cream-mid/15 px-2 py-1">
                  {k}: {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </details>

      <OperationalCard title="Severity rollup" meta={`deduped findings · worst ${data.worstSeverity}`}>
        <p className="text-[13px] text-charcoal/70 mb-4">
          Deduplicated by diagnostic code plus entity refs ({data.meta.findingsBeforeDedupe} raw ⇒ {data.meta.findingsAfterDedupe} rows). Ordinal severities aggregate
          across PAYMENT · FULFILLMENT · REFUND · SHIPMENT · NOTIFICATION · WEBHOOK.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-cream-dark/55 bg-white/90 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <StatusPill variant={worstPillVariant(data.worstSeverity)}>{data.worstSeverity === "NONE" ? "CLEAR" : data.worstSeverity}</StatusPill>
            </div>
            <p className="text-[13px] text-charcoal/70 leading-snug">Worst ordinal severity across merged findings.</p>
            <p className="text-[11px] uppercase tracking-[0.1em] text-charcoal/45 mt-2">Roll-up</p>
          </div>
          {(["CRITICAL", "HIGH", "WARNING", "INFO"] as const).map((key) => (
            <div key={key} className="rounded-lg border border-cream-dark/55 bg-white/90 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <StatusPill variant={severityPillVariant(key)}>{key}</StatusPill>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-charcoal">{data.summary[key]}</p>
              <p className="text-[11px] uppercase tracking-[0.1em] text-charcoal/45 mt-2">Count</p>
            </div>
          ))}
        </div>
      </OperationalCard>

      <OperationalCard title="Findings" meta="read-only validators · capped samples">
        {data.findings.length === 0 ? (
          <p className="text-[13px] text-charcoal/65">No deduped findings in this pass (caps may still omit edge cases).</p>
        ) : (
          <DenseTable>
            <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
              <tr>
                <Th>Severity</Th>
                <Th>Category</Th>
                <Th>Authority</Th>
                <Th>Code</Th>
                <Th>Message</Th>
                <Th>Refs</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {data.findings.map((f) => (
                <tr key={lifecycleFindingDedupeKey(f)} className="align-top">
                  <Td className="whitespace-nowrap">
                    <StatusPill variant={severityPillVariant(f.severity)}>{f.severity}</StatusPill>
                  </Td>
                  <Td className="text-[12px] text-charcoal/75 whitespace-nowrap">{f.category}</Td>
                  <Td className="text-[11px] text-charcoal/70 max-w-[11rem]">
                    {f.authorityDomain ? <span className="font-mono text-[10px]">{f.authorityDomain}</span> : <span className="text-charcoal/45">—</span>}
                  </Td>
                  <Td className="font-mono text-[11px] text-charcoal/80">{f.code}</Td>
                  <Td className="text-[12px] text-charcoal/80">
                    <p>{f.message}</p>
                    {f.authorityNote ? (
                      <p className="text-[11px] text-charcoal/58 mt-1">
                        <span className="font-semibold text-charcoal/50">Authority note: </span>
                        {f.authorityNote}
                      </p>
                    ) : null}
                    {f.remediationHint ? (
                      <p className="text-[11px] text-charcoal/58 mt-1">
                        <span className="font-semibold text-charcoal/50">Hint: </span>
                        {f.remediationHint}
                      </p>
                    ) : null}
                  </Td>
                  <Td className="min-w-[12rem]">
                    <EntityRefLinks refs={f.entityRefs} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </DenseTable>
        )}
      </OperationalCard>

      <OperationalCard title="Heuristic notes" meta="false positives">
        <ul className="list-disc pl-5 text-[13px] text-charcoal/75 space-y-2">
          <li>
            <span className="font-semibold">Notifications:</span> terminal-order pending rows for{" "}
            <span className="font-mono">commerce.payment.square_webhook</span> older than four hours — conservative backlog signal; workloads may deliberately pause outbound email.
          </li>
          <li>
            <span className="font-semibold">Shipments:</span> missing tracking on advanced status buckets accepts manual carrier flows and pre-label placeholders.
          </li>
          <li>
            <span className="font-semibold">Payment samples:</span> reuse payment-integrity Postgres caps — totals may exceed visible rows elsewhere.
          </li>
        </ul>
      </OperationalCard>
    </div>
  );
}

function DenseTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
      <table className="w-full min-w-[56rem] text-left text-[13px]">{children}</table>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2 font-semibold">{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
