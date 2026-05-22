import Link from "next/link";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import OperationalBreadcrumbs from "@/components/super-admin/operations/OperationalBreadcrumbs";
import OperationalCrossLinks from "@/components/super-admin/operations/OperationalCrossLinks";
import OperationalEscalationBanner from "@/components/super-admin/operations/OperationalEscalationBanner";
import { notificationDeliveryFailureOperationalContext } from "@/components/super-admin/operations/operationalIncidentPresets";
import { superAdminOperationsBreadcrumbs } from "@/components/super-admin/operations/superAdminOperationsBreadcrumbs";
import NotificationOutboxOperationsClient from "@/components/super-admin/operations/notifications-health/NotificationOutboxOperationsClient";
import CommunicationTruthPanel from "@/components/super-admin/operations/notifications-health/CommunicationTruthPanel";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import { loadNotificationOperationalHealth } from "@/lib/super-admin/notifications/loadNotificationOperationalHealth";
import { loadCommunicationTruthInspectionBundle } from "@/lib/super-admin/notifications/communicationTruth/reportCommunicationTruth";
import type { CommunicationTruthInspectionBundle } from "@/lib/super-admin/notifications/communicationTruth/reportCommunicationTruth";
import type { NotificationExtendedDeliveryUiLabel } from "@/lib/super-admin/notifications/notificationDeliverySignals";
import {
  deriveNotificationLifecycleState,
  notificationOutboundLeaseIsStaleHeld,
} from "@/lib/super-admin/notifications/deriveNotificationLifecycleState";
import { INTEGRATION_SYSTEM_KEYS } from "@/lib/operations/integrationHealth/types";
import { OPERATIONS_RUNBOOK_PATHS } from "@/components/super-admin/operations/operationalIncidentContext";

export const dynamic = "force-dynamic";

function fmtShort(iso: Date): string {
  return iso.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function fmtIsoOrDash(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : fmtShort(d);
}

function readAttempts(payload: unknown): number | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const meta = (payload as Record<string, unknown>)._process;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const m = meta as Record<string, unknown>;
  const a = m.attempts ?? m.delivery_attempt;
  return typeof a === "number" && Number.isFinite(a) ? a : null;
}

function readLastErrorSnippet(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const meta = (payload as Record<string, unknown>)._process as Record<string, unknown> | undefined;
  const code = meta?.lastErrorCode;
  const err = meta?.lastError;
  if (typeof code === "string" && code.trim()) return `${code}: ${typeof err === "string" ? err.slice(0, 80) : ""}`;
  if (typeof err === "string" && err.trim()) return err.slice(0, 100);
  return null;
}

function providerIdSnippet(providerMessageId: string | null): string | null {
  if (!providerMessageId || !providerMessageId.trim()) return null;
  const t = providerMessageId.trim();
  return `${t.slice(0, 14)}…`;
}

function lifecycleVariant(s: ReturnType<typeof deriveNotificationLifecycleState>): StatusPillVariant {
  switch (s) {
    case "delivered_success":
      return "neutral";
    case "processing":
      return "warning";
    case "failed_retryable":
    case "failed_terminal":
      return "degraded";
    case "dead_letter":
      return "critical";
    default:
      return "neutral";
  }
}

function extendedDeliveryVariant(label: NotificationExtendedDeliveryUiLabel): StatusPillVariant {
  switch (label) {
    case "provider_submitted":
      return "neutral";
    case "accepted_without_provider_id":
      return "warning";
    case "processing":
      return "warning";
    case "provider_failed":
      return "degraded";
    case "terminal_dead_letter":
      return "critical";
    default:
      return "neutral";
  }
}

function inspectNotificationHref(notificationId: string) {
  return `/super-admin/operations/notifications-health?inspect=${encodeURIComponent(notificationId)}`;
}

export default async function NotificationOperationalHealthPage({
  searchParams,
}: {
  searchParams?: Promise<{ inspect?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const inspectRaw = typeof sp.inspect === "string" ? sp.inspect.trim() : "";

  const now = new Date();
  const snap = await loadNotificationOperationalHealth(now);

  let inspectionBundle: CommunicationTruthInspectionBundle | null = null;
  let inspectionError: "bad_id" | "not_found" | null = null;
  if (inspectRaw) {
    const inspection = await loadCommunicationTruthInspectionBundle(inspectRaw, now);
    if (inspection.ok) inspectionBundle = inspection.bundle;
    else inspectionError = inspection.reason;
  }

  const reliability = snap.reliability;

  const legend = [
    { key: "pending", text: "`processed_at` null, lease clear, no persisted failure bookkeeping yet." },
    { key: "processing", text: "`started_processing_at` fresh (&lt;15m) — single-flight lease held." },
    { key: "failed_retryable", text: "`processed_at` null after a failed attempt — cron retries with incremented attempts." },
    { key: "delivered_success", text: "`processed_at` set; provider ids may appear on `_process`/root JSON." },
    { key: "failed_terminal", text: "`processed_at` set with `_process.last_error` but below attempt-cap classification." },
    { key: "dead_letter", text: "`processed_at` set with attempt-cap / `attempt_cap` bookkeeping — rewind is destructive." },
  ] as const;

  const deliveryLegend = [
    { key: "queued", text: "Lifecycle pending — cron has not completed a terminal outcome yet." },
    { key: "processing", text: "Fresh lease (&lt;15m) prevents duplicate workers from mutating payload." },
    {
      key: "provider_submitted",
      text: "Terminal success plus `provider_message_id` / `_process.last_provider_message_id` bookkeeping (SES acceptance of send request — not inbox proof).",
    },
    {
      key: "accepted_without_provider_id",
      text: "Terminal processor success without persisted transport id (typical skeleton / non-email types).",
    },
    { key: "provider_failed", text: "Last surfaced attempt failed before eventual terminal success/dead-letter (includes retry lanes)." },
    { key: "terminal_dead_letter", text: "`attempt_cap` / hard-cap exhaustion — rewind is audited and destructive." },
  ] as const;

  const backlogLeaseCandidates = snap.backlogSample
    .filter((r) => r.startedProcessingAt)
    .map((r) => ({
      id: r.id,
      type: r.type,
      leaseStale: notificationOutboundLeaseIsStaleHeld(r.startedProcessingAt, new Date(snap.generatedAt)),
    }));

  const deadLetterSample = snap.recentTerminalFailures
    .filter((r) => r.lifecycleState === "dead_letter")
    .map((r) => ({ id: r.id, type: r.type }));

  const notificationFailureContext = notificationDeliveryFailureOperationalContext();
  const backlogEscalated =
    snap.backlog.pendingOverTwentyFourHours > 0 ||
    reliability.deadLetterAttemptCapRows > 0 ||
    deadLetterSample.length > 0;

  return (
    <div className="space-y-8">
      <OperationalBreadcrumbs
        segments={superAdminOperationsBreadcrumbs("Notification health")}
        className="-mb-2"
      />

      <OperationalEscalationBanner forceShow={backlogEscalated} title="Backlog / terminal risk">
        <p>
          Pending outbox rows are aging, dead-letter totals are non-zero, or attempt-cap terminals were detected in the aggregate scan. Use operator requeue
          below with lease rules; prefer governance + webhook correlation before destructive dead-letter rewinds.
        </p>
      </OperationalEscalationBanner>
      <GovPageHeader
        eyebrow="Platform · Operations · Internal"
        title="Notification outbox operational health"
        subtitle="Read-mostly Postgres view of transactional notification_events. Delivery still depends on scheduled hits to /api/internal/cron/notification-outbox — without cron, backlog grows even when Postgres looks healthy."
        actions={
          <Link
            href="/super-admin/operations/safety"
            className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
          >
            Operational safety
          </Link>
        }
      />

      <OperationalCrossLinks context={notificationFailureContext} />

      <OperationalCard title="Provider truth vs customer inbox" meta="interpretation caveats · same raw rows as lifecycle cards">
        <ul className="space-y-2 text-[13px] text-charcoal/75 mb-4">
          <li>
            <span className="font-semibold text-charcoal/85">SES message id present</span> means the transport acknowledged the outbound API call —{" "}
            <span className="font-semibold text-charcoal/85">not</span> that the diner read the email, unsubscribed cleanly, or that downstream reputation events
            were ingested here.
          </li>
          <li>
            Bounce / complaint ingestion is stub-only today: authenticated posts to{" "}
            <span className="font-mono text-[11px]">/api/internal/webhooks/ses-notification</span> emit timeline noise with{" "}
            <span className="font-mono text-[11px]">system.email.bounce_stub_received</span> — correlate counts below, but do not treat them as full-fidelity deliverability.
          </li>
          <li>
            `WebhookDeliveryReceipt` rows labelled `ses` reflect whatever inbound/webhook adapters write — they do not retroactively disprove an outbox terminal
            success without an explicit linkage model.
          </li>
        </ul>
      </OperationalCard>

      <OperationalCard title="Delivery lane legend" meta="additive classifier from notificationDeliverySignals.ts">
        <ul className="space-y-2 text-[13px] text-charcoal/75">
          {deliveryLegend.map((row) => (
            <li key={row.key}>
              <span className="font-mono text-[12px] text-charcoal/90">{row.key}</span> — {row.text}
            </li>
          ))}
        </ul>
      </OperationalCard>

      <OperationalCard title="Lifecycle legend" meta="UI classifier mirrors processor comments">
        <ul className="space-y-2 text-[13px] text-charcoal/75">
          {legend.map((row) => (
            <li key={row.key}>
              <span className="font-mono text-[12px] text-charcoal/90">{row.key}</span> — {row.text}
            </li>
          ))}
        </ul>
      </OperationalCard>

      <CommunicationTruthPanel
        report={snap.communicationTruth}
        inspectBundle={inspectionBundle}
        inspectError={inspectRaw ? inspectionError : null}
        runbookRepoPath={OPERATIONS_RUNBOOK_PATHS.notificationsWebhooksReplay}
        generatedAtIso={snap.generatedAt}
      />

      <OperationalCard title="Delivery reliability rollup" meta="honest Postgres aggregates · not a SLA dashboard">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ReliabilityStat label="Processed (24h)" value={String(reliability.processedLast24h)} hint="processed_at timestamps in trailing day." />
          <ReliabilityStat
            label="Terminals + provider id"
            value={String(reliability.terminalRowsWithPersistedProviderMessageId)}
            hint="processed_at terminals without `_process.last_error` / `last_error_code`, with SES id stamping present."
          />
          <ReliabilityStat
            label="Dead-letter attempt_cap rows"
            value={String(reliability.deadLetterAttemptCapRows)}
            hint="payload._process.lastErrorCode === attempt_cap snapshot."
          />
          <ReliabilityStat
            label="Avg lag (24h terminals)"
            value={
              reliability.throughputAvgLagProcessedLast24hMs != null ?
                `${Math.round(reliability.throughputAvgLagProcessedLast24hMs).toLocaleString()} ms`
              : "—"
            }
            hint="MEAN(processed_at - created_at) for rows terminalised in trailing 24h."
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ReliabilityStat
            label="Outbox-keyed SES rows failed"
            value={String(reliability.correlation.outboundNotifKeyedEmailFailuresLast24h)}
            hint="EmailMessage.direction=outbound, idempotencyKey starts with notif-, deliveryStatus=failed, created in trailing 24h."
          />
          <ReliabilityStat
            label="Operator requeues (24h)"
            value={String(reliability.governanceTouches.operatorNotificationRequeuesLast24h)}
            hint="GovernanceAuditEvent OPERATIONS_NOTIFICATION_EVENT_OPERATOR_REQUEUE."
          />
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45 mb-2">Terminal error buckets (top 5)</p>
          {reliability.terminalFailureBuckets.length === 0 ? (
            <p className="text-[13px] text-charcoal/60">No grouped failure snapshots (or empty error strings).</p>
          ) : (
            <ul className="space-y-1 text-[13px] text-charcoal/75">
              {reliability.terminalFailureBuckets.map((b) => (
                <li key={b.substringKey} className="flex flex-wrap gap-2">
                  <span className="font-mono text-[11px] break-all">{b.substringKey}</span>
                  <span className="text-charcoal/45">·</span>
                  <span>{b.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </OperationalCard>

      <OperationalCard
        title="Scheduler & integration-heartbeat honesty"
        meta="IntegrationHealthSnapshot proxies only — verify schedulers externally"
      >
        <p className="text-[13px] text-charcoal/75 mb-3">
          There is <span className="font-semibold text-charcoal/85">no automated notification-outbox cron heartbeat</span> persisted in{" "}
          <span className="font-mono text-[11px]">integration_health_snapshots</span>. Throughput cards above show rows the worker finished, which is correlated
          with cron but cannot prove infra scheduling without external logs / metrics.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <ReliabilityStat
            label={`Last integration success · ${INTEGRATION_SYSTEM_KEYS.EMAIL}`}
            value={fmtIsoOrDash(reliability.cronFreshness.proxyEmailProbeLastSuccessAtIso)}
            hint="Integration health EMAIL probe succeeded_at (SES readiness checks, not backlog drain)."
          />
          <ReliabilityStat
            label={`Last integration success · ${INTEGRATION_SYSTEM_KEYS.INTERNAL_API}`}
            value={fmtIsoOrDash(reliability.cronFreshness.proxyInternalApiHealthLastSuccessAtIso)}
            hint="Cron-style integration-health evaluator hitting /api/health."
          />
        </div>
      </OperationalCard>

      <OperationalCard title="Webhook / SES receipt counters" meta="OperationalActivityEvent + WebhookDeliveryReceipt">
        <div className="grid gap-3 sm:grid-cols-2">
          <ReliabilityStat
            label="Bounce stub timeline rows (24h)"
            value={String(reliability.sesNotificationStubSignals.bounceStubOperationalEventsLast24h)}
            hint="OperationalActivityEvent.type === system.email.bounce_stub_received (internal authenticated stub)."
          />
          <ReliabilityStat
            label="Ses-labelled receipts (30d)"
            value={String(reliability.webhookSesReceiptSignals.sesLabelledWebhookReceiptsLast30d)}
            hint="WebhookDeliveryReceipt.provider contains ses (case-insensitive)."
          />
        </div>
      </OperationalCard>

      <OperationalCard title="Backlog buckets" meta="processed_at · null counts by created_at age">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-cream-dark/50 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.1em] text-charcoal/45">&lt; 1 hour</p>
            <p className="text-2xl font-semibold text-charcoal">{snap.backlog.pendingUnderOneHour}</p>
          </div>
          <div className="rounded-lg border border-cream-dark/50 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.1em] text-charcoal/45">1h – 24h</p>
            <p className="text-2xl font-semibold text-charcoal">{snap.backlog.pendingOneHourToTwentyFourHours}</p>
          </div>
          <div className="rounded-lg border border-cream-dark/50 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.1em] text-charcoal/45">&gt; 24 hours</p>
            <p className="text-2xl font-semibold text-charcoal">{snap.backlog.pendingOverTwentyFourHours}</p>
          </div>
        </div>
      </OperationalCard>

      <OperationalCard
        title="Latency sample (recent processed)"
        meta={`last ${snap.latency.sampleSize} rows · create → processed deltas`}
      >
        <p className="text-[13px] text-charcoal/70 mb-2">
          Avg lag {snap.latency.avgLagMs != null ? `${snap.latency.avgLagMs.toLocaleString()} ms` : "—"} · max{" "}
          {snap.latency.maxLagMs != null ? `${snap.latency.maxLagMs.toLocaleString()} ms` : "—"}
        </p>
      </OperationalCard>

      <OperationalCard title="Backlog FIFO sample" meta="classified · asc created_at · capped">
        <DenseTable minWidthClass="min-w-[58rem]">
          <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
            <tr>
              <Th>State</Th>
              <Th>Delivery lane</Th>
              <Th>Bounce hint</Th>
              <Th>Type</Th>
              <Th>Attempts</Th>
              <Th>Lease</Th>
              <Th>Created</Th>
              <Th>Inspect</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-dark/40">
            {snap.backlogSample.map((n) => {
              const lc = deriveNotificationLifecycleState(n, new Date(snap.generatedAt));
              const sig = n.deliverySignals;
              return (
                <tr key={n.id}>
                  <Td>
                    <StatusPill variant={lifecycleVariant(lc)}>{lc}</StatusPill>
                  </Td>
                  <Td>
                    <StatusPill variant={extendedDeliveryVariant(sig.extendedLabel)}>{sig.extendedLabel}</StatusPill>
                  </Td>
                  <Td className="text-[11px] text-charcoal/70">{sig.hasKnownBounceSignal ? "yes (payload text)" : "—"}</Td>
                  <Td className="font-mono text-[11px] break-all">{n.type}</Td>
                  <Td className="font-mono text-[11px]">{readAttempts(n.payload) ?? "—"}</Td>
                  <Td className="text-[11px] text-charcoal/65">{n.startedProcessingAt ? fmtShort(n.startedProcessingAt) : "—"}</Td>
                  <Td className="text-[12px] text-charcoal/65">{fmtShort(n.createdAt)}</Td>
                  <Td>
                    <Link
                      href={inspectNotificationHref(n.id)}
                      className="text-[12px] font-semibold text-teal-dark underline underline-offset-2"
                    >
                      Truth
                    </Link>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DenseTable>
      </OperationalCard>

      <OperationalCard title="Recent terminal failures (sample)" meta="desc processed_at · UI terminal states">
        {snap.recentTerminalFailures.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">None surfaced in capped scan.</p>
        ) : (
          <DenseTable minWidthClass="min-w-[58rem]">
            <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
              <tr>
                <Th>State</Th>
                <Th>Delivery lane</Th>
                <Th>Bounce hint</Th>
                <Th>Type</Th>
                <Th>Attempts</Th>
                <Th>Error</Th>
                <Th>Processed</Th>
                <Th>Inspect</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {snap.recentTerminalFailures.map((n) => (
                <tr key={n.id}>
                  <Td>
                    <StatusPill variant={lifecycleVariant(n.lifecycleState)}>{n.lifecycleState}</StatusPill>
                  </Td>
                  <Td>
                    <StatusPill variant={extendedDeliveryVariant(n.deliverySignals.extendedLabel)}>{n.deliverySignals.extendedLabel}</StatusPill>
                  </Td>
                  <Td className="text-[11px] text-charcoal/70">{n.deliverySignals.hasKnownBounceSignal ? "yes (payload text)" : "—"}</Td>
                  <Td className="font-mono text-[11px] break-all">{n.type}</Td>
                  <Td className="font-mono text-[11px]">{readAttempts(n.payload) ?? "—"}</Td>
                  <Td className="font-mono text-[11px] text-charcoal/70">{readLastErrorSnippet(n.payload) ?? "—"}</Td>
                  <Td className="text-[12px]">{n.processedAt ? fmtShort(n.processedAt) : "—"}</Td>
                  <Td>
                    <Link
                      href={inspectNotificationHref(n.id)}
                      className="text-[12px] font-semibold text-teal-dark underline underline-offset-2"
                    >
                      Truth
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DenseTable>
        )}
      </OperationalCard>

      <OperationalCard title="Recent successes (sample)" meta="delivered classifier · provider snippet">
        {snap.recentSuccesses.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">None in sample window.</p>
        ) : (
          <DenseTable minWidthClass="min-w-[48rem]">
            <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
              <tr>
                <Th>Delivery lane</Th>
                <Th>Type</Th>
                <Th>Provider id</Th>
                <Th>Processed</Th>
                <Th>Inspect</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/40">
              {snap.recentSuccesses.map((n) => (
                <tr key={n.id}>
                  <Td>
                    <StatusPill variant={extendedDeliveryVariant(n.deliverySignals.extendedLabel)}>{n.deliverySignals.extendedLabel}</StatusPill>
                  </Td>
                  <Td className="font-mono text-[11px] break-all">{n.type}</Td>
                  <Td className="font-mono text-[11px]">{providerIdSnippet(n.deliverySignals.providerMessageId) ?? "—"}</Td>
                  <Td className="text-[12px]">{n.processedAt ? fmtShort(n.processedAt) : "—"}</Td>
                  <Td>
                    <Link
                      href={inspectNotificationHref(n.id)}
                      className="text-[12px] font-semibold text-teal-dark underline underline-offset-2"
                    >
                      Truth
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DenseTable>
        )}
      </OperationalCard>

      <OperationalCard
        id="notification-operator-requeue"
        title="Operator actions"
        meta="governance audited · destructive paths gated"
      >
        <p className="text-[13px] text-charcoal/70 mb-4">
          API:{" "}
          <span className="font-mono text-[12px]">POST /api/super-admin/operations/notification-events/[id]/operator-requeue</span>
        </p>
        <NotificationOutboxOperationsClient leaseCandidates={backlogLeaseCandidates} deadLetterRows={deadLetterSample} />
      </OperationalCard>
    </div>
  );
}

function ReliabilityStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-cream-dark/55 bg-white px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.1em] text-charcoal/45">{label}</p>
      <p className="text-xl font-semibold text-charcoal">{value}</p>
      <p className="text-[11px] text-charcoal/55 mt-1">{hint}</p>
    </div>
  );
}

function DenseTable({ children, minWidthClass = "min-w-[40rem]" }: { children: React.ReactNode; minWidthClass?: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
      <table className={`w-full text-left text-[13px] ${minWidthClass}`}>{children}</table>
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
