import Link from "next/link";

import OperationalCard from "@/components/governance/OperationalCard";
import type { CommunicationTruthInspectionBundle } from "@/lib/super-admin/notifications/communicationTruth/reportCommunicationTruth";
import type { CommunicationTruthReport } from "@/lib/super-admin/notifications/communicationTruth/types";
import { COMMUNICATION_ABANDONED_BACKLOG_THRESHOLD_HOURS } from "@/lib/super-admin/notifications/communicationTruth/types";

const PHASE_LEGEND: { key: string; text: string }[] = [
  { key: "queued", text: "`processed_at` null — waiting for cron / processor; `_process` has no surfaced failure bookkeeping for this classifier." },
  {
    key: "abandoned_backlog_risk",
    text: `Pending rows older than ~${COMMUNICATION_ABANDONED_BACKLOG_THRESHOLD_HOURS}h without a terminal outcome — starvation / scheduler risk (not an official dead-letter enum).`,
  },
  {
    key: "leasing_processing",
    text: "Fresh `<15m` `started_processing_at` lease — another worker owns the mutation window until staleness clears.",
  },
  {
    key: "awaiting_scheduler_retry",
    text: "`failed_retryable` posture — `_process` recorded an error slice; cron will retry with incremented attempts.",
  },
  {
    key: "provider_submitted_transport_ack",
    text: "Terminal with persisted SES/transport correlation id — **provider accepted outbound submission**, not proof a human saw the message.",
  },
  {
    key: "provider_terminal_success_without_transport_correlation",
    text: "Lifecycle success without transport id bookkeeping — often non-email skeleton processors; inbox truth unknown.",
  },
  {
    key: "provider_terminal_failed",
    text: "`processed_at` terminal with surfaced `_process` failures below attempt-cap dead-letter bookkeeping.",
  },
  { key: "dead_letter_attempt_cap", text: "`attempt_cap` / hard-cap bookkeeping — rewind is audited and destructive." },
  {
    key: "post_operator_dead_letter_rewind_pending",
    text: "Pending row whose **latest governance audit mode** is destructive dead-letter rewind (operator reopened the row).",
  },
  {
    key: "operator_governance_audit_trail_pending",
    text: "Pending row with governance `OPERATIONS_NOTIFICATION_EVENT_OPERATOR_REQUEUE` history — latest audit may be Phase A lease clear.",
  },
];

function histogramEntries(report: CommunicationTruthReport): Array<{ phase: string; count: number }> {
  return Object.entries(report.phaseHistogramApprox)
    .map(([phase, count]) => ({ phase, count: count ?? 0 }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.phase.localeCompare(b.phase)));
}

export default function CommunicationTruthPanel({
  report,
  inspectBundle,
  inspectError,
  runbookRepoPath,
  generatedAtIso,
}: {
  report: CommunicationTruthReport;
  inspectBundle?: CommunicationTruthInspectionBundle | null;
  inspectError?: "bad_id" | "not_found" | null;
  runbookRepoPath: string;
  generatedAtIso: string;
}) {
  const transportAck = report.sampleTerminalTransportAckCount ?? 0;
  const bounceHints = report.sampleTransportAckWithPayloadBounceHintCount ?? 0;
  const transportAckBounceTelemetryUnknown = Math.max(0, transportAck - bounceHints);

  return (
    <OperationalCard
      title="Truth & timeline"
      meta="lifecycle · governance audits · capped samples — see honesty notes below"
    >
      <p className="text-[13px] text-charcoal/75 mb-3">
        Runbook:&nbsp;
        <span className="font-mono text-[11px] text-charcoal/90">{runbookRepoPath}</span>
        &nbsp;(open from repository checkout — covers replay/backlog sequencing next to SES readiness).
      </p>
      <p className="text-[13px] text-charcoal/70 mb-4">
        <Link href="/super-admin/operations/webhook-replay" className="font-semibold text-teal-dark underline underline-offset-2">
          Webhook replay console
        </Link>{" "}
        persists `OperationalWebhookReplayAudit`; notification operator touches stay on{" "}
        <span className="font-mono text-[11px]">GovernanceAuditEvent · OPERATIONS_NOTIFICATION_EVENT_OPERATOR_REQUEUE</span>.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Phase legend · communicationTruth</p>
          <ul className="space-y-2 text-[12px] text-charcoal/75">
            {PHASE_LEGEND.map((row) => (
              <li key={row.key}>
                <span className="font-mono text-[11px] text-charcoal/90">{row.key}</span> — {row.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Deduped sample histogram</p>
            <p className="text-[11px] text-charcoal/55 mb-2">
              {report.sampleRowCountDeduped} rows merged (backlog sample + capped recent terminals) —&nbsp;
              <span className="font-semibold text-charcoal/70">not a full Postgres census</span>.
            </p>
            {histogramEntries(report).length === 0 ?
              <p className="text-[13px] text-charcoal/60">Nothing counted (empty surfaced window).</p>
            : (
              <ul className="space-y-1 text-[13px] text-charcoal/80">
                {histogramEntries(report).map((row) => (
                  <li key={row.phase} className="flex gap-2">
                    <span className="font-mono text-[11px] break-all">{row.phase}</span>
                    <span className="text-charcoal/40">→</span>
                    <span className="font-semibold">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-cream-dark/50 bg-white/90 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.1em] text-charcoal/45">Provider id vs bounce telemetry</p>
            <p className="text-[22px] font-semibold text-charcoal">{transportAck}</p>
            <p className="text-[11px] text-charcoal/60 mt-1">
              Rows in surfaced sample carrying `provider_message_id` / `_process.last_provider_message_id`.
            </p>
            <p className="text-[13px] text-charcoal/75 mt-2">
              <span className="font-semibold text-charcoal/85">{transportAckBounceTelemetryUnknown}</span> of those have{" "}
              <span className="font-semibold">no heuristic bounce/suppression wording</span> in `_process` strings — SES disposition is still&nbsp;
              <span className="font-semibold">unknown unless manually correlated</span> (stub bounce ingestion only).
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Honesty notes</p>
        <ul className="list-disc ml-5 space-y-1 text-[12px] text-charcoal/70">
          {report.honestyNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
          <li>Governance touches (24h): {report.operatorRequeueAuditCountLast24h ?? "—"}.</li>
          {report.replayCorrelationHint ?
            <li>{report.replayCorrelationHint}</li>
          : null}
        </ul>
      </div>

      <div className="mt-8 border-t border-cream-dark/45 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Selected event inspector</p>
        <p className="text-[13px] text-charcoal/70 mb-4">
          Use <span className="font-mono text-[11px]">?inspect=&lt;uuid&gt;</span> or the Inspect links in the tables (`generated_at` baseline {generatedAtIso}).
        </p>
        {inspectError === "bad_id" ?
          <p className="text-[13px] text-amber-900/90">Inspection skipped — malformed UUID parameter.</p>
        : inspectError === "not_found" ?
          <p className="text-[13px] text-amber-900/90">No `notification_events` row for that UUID.</p>
        : inspectBundle ?
          <InspectionDetail bundle={inspectBundle} />
        : (
          <p className="text-[13px] text-charcoal/60">No UUID selected.</p>
        )}
      </div>
    </OperationalCard>
  );
}

function InspectionDetail({ bundle }: { bundle: CommunicationTruthInspectionBundle }) {
  return (
    <div className="space-y-5 text-[13px] text-charcoal/80">
      <div className="flex flex-wrap gap-3 items-baseline justify-between">
        <p className="font-mono text-[11px] break-all text-charcoal/90">{bundle.notificationId}</p>
        <Link
          href="/super-admin/operations/notifications-health"
          className="text-[12px] font-semibold text-teal-dark underline underline-offset-2"
        >
          Clear inspection
        </Link>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Resolved phase (JSON)</p>
        <pre className="overflow-x-auto rounded-lg border border-cream-dark/50 bg-charcoal/[0.03] px-3 py-2 text-[11px] leading-snug whitespace-pre-wrap">
          {JSON.stringify(bundle.phase, null, 2)}
        </pre>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Provider truth vs inbox</p>
        <p className="text-charcoal/75">{bundle.providerTruth.customerDeliveryDisclaimer}</p>
        <ul className="mt-2 text-[11px] text-charcoal/60 font-mono space-y-0.5">
          <li>bounce telemetry in-product: {String(bundle.providerTruth.bounceTelemetryInProduct)} (no automated linkage today)</li>
          <li>bounce heuristic from `_process`: {bundle.providerTruth.bounceHintFromPayloadTextOnly ? "yes" : "no"}</li>
          <li>provider_message_id: {bundle.providerTruth.providerMessageId ?? "none"}</li>
        </ul>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Stitched timeline (capped)</p>
        {bundle.timeline.length === 0 ?
          <p className="text-charcoal/55">Timeline empty.</p>
        : (
          <ol className="space-y-2 list-decimal ml-6 text-charcoal/75">
            {bundle.timeline.map((e, idx) => (
              <li key={`${e.kind}-${e.atIso}-${idx}`}>
                <span className="font-mono text-[10px] text-charcoal/55">{e.atIso}</span> — {e.label}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Governance · operator requeues</p>
        {bundle.governanceAudits.length === 0 ?
          <p className="text-charcoal/60">None recorded for this id (GovernanceAuditEvent query capped elsewhere).</p>
        : (
          <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-cream-mid/20 text-[10px] uppercase tracking-[0.08em] text-charcoal/50">
                <tr>
                  <th className="px-2 py-1.5">When</th>
                  <th className="px-2 py-1.5">Mode</th>
                  <th className="px-2 py-1.5">Actor</th>
                  <th className="px-2 py-1.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/40">
                {bundle.governanceAudits.map((a) => (
                  <tr key={a.id}>
                    <td className="px-2 py-1.5 whitespace-nowrap font-mono text-[10px]">{a.createdAtIso}</td>
                    <td className="px-2 py-1.5 font-mono">{a.mode}</td>
                    <td className="px-2 py-1.5">{a.actorName ?? "—"}</td>
                    <td className="px-2 py-1.5 text-charcoal/70">{a.description ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
