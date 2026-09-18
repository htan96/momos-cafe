import Link from "next/link";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import OperationalBreadcrumbs from "@/components/super-admin/operations/OperationalBreadcrumbs";
import OperationalCrossLinks from "@/components/super-admin/operations/OperationalCrossLinks";
import { operationalReadinessIncidentContext } from "@/components/super-admin/operations/operationalIncidentPresets";
import { superAdminOperationsBreadcrumbs } from "@/components/super-admin/operations/superAdminOperationsBreadcrumbs";
import { loadOperationalReadinessReport } from "@/lib/super-admin/operationalReadiness/loadOperationalReadinessReport";
import type { OperationalEnvIssue } from "@/lib/super-admin/operationalReadiness/environmentOperationalValidation";
import type { OperationalReadinessSeverity } from "@/lib/super-admin/operationalReadiness/environmentOperationalValidation";

import { describeOperationalSemanticsSnapshot } from "@/lib/operations/semantics/describeOperationalSemanticsSnapshot";

export const dynamic = "force-dynamic";

const INTEGRATION_ORDER = [
  "Square",
  "Shippo",
  "SES outbound",
  "SES inbound",
  "Internal API",
  "Cognito",
  "Other",
] as const;

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function severityPillVariant(level: OperationalReadinessSeverity): StatusPillVariant {
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

function integrationBucket(issue: OperationalEnvIssue): (typeof INTEGRATION_ORDER)[number] {
  const c = issue.code;
  if (c.startsWith("square_")) return "Square";
  if (c.startsWith("shippo_")) return "Shippo";
  if (c.startsWith("ses_outbound")) return "SES outbound";
  if (c.startsWith("ses_inbound")) return "SES inbound";
  if (c.startsWith("internal_")) return "Internal API";
  if (c.startsWith("cognito_")) return "Cognito";
  return "Other";
}

export default async function SuperAdminOperationalReadinessPage() {
  const report = await loadOperationalReadinessReport();

  const grouped = new Map<string, OperationalEnvIssue[]>();
  for (const issue of report.envIssues) {
    const bucket = integrationBucket(issue);
    const cur = grouped.get(bucket) ?? [];
    cur.push(issue);
    grouped.set(bucket, cur);
  }

  const readinessContext = operationalReadinessIncidentContext();

  const semanticsPreviewLines = describeOperationalSemanticsSnapshot();

  return (
    <div className="space-y-8">
      <OperationalBreadcrumbs segments={superAdminOperationsBreadcrumbs("Readiness")} className="-mb-2" />
      <GovPageHeader
        eyebrow="Platform · Operations"
        title="Operational readiness"
        subtitle={`Deployment env heuristics + Operational Safety rollup. Snapshot env pass ${fmtShort(report.generatedAt)} · safety data ${fmtShort(report.runtime.fromSafety.generatedAt)}.`}
        actions={
          <Link
            href="/super-admin/operations/safety"
            className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
          >
            Operational safety →
          </Link>
        }
      />

      <OperationalCrossLinks context={readinessContext} />

      <div
        className={`rounded-xl border px-4 py-3 shadow-sm ${
          report.overallSeverity === "CRITICAL"
            ? "border-red-300 bg-red-50/90"
            : report.overallSeverity === "HIGH"
              ? "border-amber-300 bg-amber-50/85"
              : report.overallSeverity === "WARNING"
                ? "border-cream-dark/55 bg-white/95"
                : "border-cream-dark/40 bg-cream-mid/25"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill variant={severityPillVariant(report.overallSeverity)}>{report.overallSeverity}</StatusPill>
          <span className="text-[13px] font-semibold text-charcoal">Overall readiness</span>
        </div>
        <p className="mt-2 text-[13px] text-charcoal/75">
          Worst ordinal across env scan severities and Operational Safety tier counts (CRITICAL HIGH WARNING INFO). Env issues
          do not mutate handlers — they mirror known deployment gates only.
        </p>
      </div>

      <OperationalCard title="Effective thresholds (semantics preview)" meta="read-only · lib/operations/semantics">
        <p className="text-[13px] text-charcoal/70 mb-3">
          Canonical durations and escalation notes used by Operational Safety, payment/lifecycle scanners, notifications, and ops
          queues. Narrative companion:{' '}
          <span className="font-mono text-[11px] text-charcoal/55">
            docs/architecture/operational-semantics.md
          </span>
          .
        </p>
        <ul className="space-y-1.5 max-h-72 overflow-y-auto text-[12px] text-charcoal/80 font-mono leading-snug pr-2">
          {semanticsPreviewLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </OperationalCard>

      <OperationalCard title="Environment configuration" meta="process.env heuristic · grouped by integration">
        {report.envIssues.length === 0 ? (
          <p className="text-[13px] text-charcoal/70">No heuristic gaps detected.</p>
        ) : (
          <div className="space-y-6">
            {INTEGRATION_ORDER.map((label) => {
              const rows = grouped.get(label);
              if (!rows?.length) return null;
              return (
                <div key={label}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">{label}</p>
                  <ul className="space-y-3">
                    {rows.map((row) => (
                      <li key={row.code} className="rounded-lg border border-cream-dark/50 bg-white/90 px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <StatusPill variant={severityPillVariant(row.severity)}>{row.severity}</StatusPill>
                          <span className="font-mono text-[11px] text-charcoal/55">{row.code}</span>
                        </div>
                        <p className="text-[13px] text-charcoal/85">{row.message}</p>
                        <p className="text-[12px] text-charcoal/60 mt-1">
                          <span className="font-semibold text-charcoal/50">Remediation: </span>
                          {row.remediation}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </OperationalCard>

      <OperationalCard title="Runtime signals (Operational Safety)" meta="Postgres · link to full dashboard">
        <p className="text-[13px] text-charcoal/70 mb-4">
          Summary buckets mirror{" "}
          <Link href="/super-admin/operations/safety" className="font-semibold text-teal-dark hover:underline">
            Operational safety
          </Link>{" "}
          — webhook receipts, payments drift, notifications, lifecycle heuristics.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(["CRITICAL", "HIGH", "WARNING", "INFO"] as const).map((sev) => (
            <div key={sev} className="rounded-lg border border-cream-dark/55 bg-white/90 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <StatusPill variant={severityPillVariant(sev)}>{sev}</StatusPill>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-charcoal">{report.runtime.fromSafety.summary[sev]}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-[12px] text-charcoal/70">
          <div className="rounded border border-cream-dark/45 px-3 py-2 bg-cream-mid/15">
            <span className="font-semibold text-charcoal/55">Stale pending_payment (2h)</span>:{" "}
            {report.runtime.fromSafety.aggregation.stalePendingOrders2h}
          </div>
          <div className="rounded border border-cream-dark/45 px-3 py-2 bg-cream-mid/15">
            <span className="font-semibold text-charcoal/55">Stuck notifications (1h+)</span>:{" "}
            {report.runtime.fromSafety.aggregation.stuckNotifications1hPlus}
          </div>
          <div className="rounded border border-cream-dark/45 px-3 py-2 bg-cream-mid/15">
            <span className="font-semibold text-charcoal/55">Square webhooks failed (14d)</span>:{" "}
            {report.runtime.fromSafety.aggregation.squareWebhookFailed14d}
          </div>
          <div className="rounded border border-cream-dark/45 px-3 py-2 bg-cream-mid/15">
            <span className="font-semibold text-charcoal/55">Shippo webhooks failed (14d)</span>:{" "}
            {report.runtime.fromSafety.aggregation.shippoWebhookFailed14d}
          </div>
          <div className="rounded border border-cream-dark/45 px-3 py-2 bg-cream-mid/15">
            <span className="font-semibold text-charcoal/55">Paid w/o completed payment</span>:{" "}
            {report.runtime.fromSafety.aggregation.paidWithoutCompletedPayment}
          </div>
          <div className="rounded border border-cream-dark/45 px-3 py-2 bg-cream-mid/15">
            <span className="font-semibold text-charcoal/55">Governance restrictions (BLOCKED)</span>:{" "}
            {report.runtime.fromSafety.aggregation.governanceRestrictionsEnabled}
          </div>
        </div>
      </OperationalCard>

      <OperationalCard title="Governance snapshot" meta="PlatformGovernanceControl · PlatformFeatureToggle (read-only)">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Operational controls</p>
            <ul className="space-y-1.5 text-[13px] max-h-64 overflow-y-auto pr-1">
              {report.governanceSnapshot.controls.map((c) => (
                <li key={c.key} className="flex flex-wrap items-center gap-2">
                  <StatusPill variant={c.enabled ? "critical" : "ok"}>{c.enabled ? "BLOCKED" : "ACTIVE"}</StatusPill>
                  <span className="font-medium">{c.title}</span>
                  <span className="font-mono text-[10px] text-charcoal/40">{c.key}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Platform features</p>
            <ul className="space-y-1.5 text-[13px] max-h-64 overflow-y-auto pr-1">
              {report.governanceSnapshot.platformFeatures.map((f) => (
                <li key={f.key} className="flex flex-wrap items-center gap-2">
                  <StatusPill variant={f.enabled ? "ok" : "down"}>{f.enabled ? "ACTIVE" : "DISABLED"}</StatusPill>
                  <span className="font-medium">{f.title}</span>
                  <span className="font-mono text-[10px] text-charcoal/40">{f.key}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/super-admin/platform/operational-status"
              className="inline-block mt-3 text-[12px] font-semibold text-teal-dark hover:underline"
            >
              Operational status →
            </Link>
          </div>
        </div>
      </OperationalCard>
    </div>
  );
}
