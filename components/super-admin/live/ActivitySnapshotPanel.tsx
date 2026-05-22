"use client";

import Link from "next/link";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import type { LiveActivitySnapshotsResponse } from "@/lib/liveActivity/types";
import RunIntegrationHealthChecksButton from "@/app/super-admin/live-activity/RunIntegrationHealthChecksButton";

function formatCount(value: number): string {
  return value === 0 ? "—" : String(value);
}

function healthPillVariant(status: string): StatusPillVariant {
  switch (status) {
    case "healthy":
      return "ok";
    case "degraded":
      return "degraded";
    case "offline":
      return "critical";
    case "recovering":
      return "warning";
    default:
      return "neutral";
  }
}

type Props = {
  snapshots: LiveActivitySnapshotsResponse | null;
  loading: boolean;
};

export default function ActivitySnapshotPanel({ snapshots, loading }: Props) {
  return (
    <div className="space-y-4">
      <OperationalCard title="Live snapshots" meta={loading ? "Refreshing…" : snapshots?.fetchedAt ? "Real counts" : "—"}>
        {!snapshots ? (
          <p className="text-[13px] text-charcoal/60">Snapshot counts unavailable — waiting for first poll.</p>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45">Active incidents</dt>
              <dd className="mt-1 text-[20px] font-display text-charcoal">{formatCount(snapshots.activeIncidents.count)}</dd>
              {snapshots.activeIncidents.top.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {snapshots.activeIncidents.top.map((inc) => (
                    <li key={inc.id} className="text-[12px] text-charcoal/75 leading-snug">
                      <Link
                        href={`/super-admin/incidents?highlight=${encodeURIComponent(inc.id)}`}
                        className="hover:text-teal-dark underline-offset-2 hover:underline font-mono text-[11px]"
                      >
                        {inc.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45">Failed payments today</dt>
              <dd className="mt-1 text-[20px] font-display text-charcoal">{formatCount(snapshots.failedPaymentsToday)}</dd>
            </div>

            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45">Webhook failures (window)</dt>
              <dd className="mt-1 text-[20px] font-display text-charcoal">{formatCount(snapshots.webhookFailuresCount)}</dd>
            </div>

            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45">
                Webhook orphans (delivery receipts)
              </dt>
              <dd className="mt-1 text-[20px] font-display text-charcoal">
                {formatCount(snapshots.orphanWebhookReceiptWindowCount ?? 0)}
              </dd>
              <p className="mt-1 text-[11px] text-charcoal/50">
                Failed Square receipts flagged <span className="font-mono">ORPHAN_NO_LOCAL_PAYMENT</span> vs webhook
                failure counter above.
              </p>
            </div>

            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45">Auth failure spike</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-[20px] font-display text-charcoal">{formatCount(snapshots.authFailureSpike.count)}</span>
                {snapshots.authFailureSpike.elevated ? (
                  <StatusPill variant="degraded">Elevated</StatusPill>
                ) : (
                  <StatusPill variant="ok">Normal</StatusPill>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45">Notification backlog</dt>
              <dd className="mt-1 text-[20px] font-display text-charcoal">{formatCount(snapshots.notificationBacklog)}</dd>
            </div>

            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45">Queue health</dt>
              <dd className="mt-1 space-y-1 text-[12px] text-charcoal/70">
                <p>Late/stuck fulfillment · {formatCount(snapshots.queueHealth.lateOrStuckFulfillment)}</p>
                <p>Pending orchestration · {formatCount(snapshots.queueHealth.pendingOrchestrationEvents)}</p>
              </dd>
            </div>
          </dl>
        )}
      </OperationalCard>

      <OperationalCard
        title="Integration health"
        meta={
          <span className="flex items-center gap-2">
            <RunIntegrationHealthChecksButton />
          </span>
        }
      >
        {!snapshots || snapshots.degradedIntegrations.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">
            {snapshots ? "No degraded integrations in latest snapshots." : "Waiting for snapshot data."}
          </p>
        ) : (
          <ul className="divide-y divide-cream-dark/40">
            {snapshots.degradedIntegrations.map((row) => (
              <li key={row.systemKey} className="py-3 first:pt-0 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12px] text-charcoal/70">{row.systemKey}</span>
                <StatusPill variant={healthPillVariant(row.currentStatus)}>{row.currentStatus}</StatusPill>
                {row.lastErrorMessage ? (
                  <span className="text-[12px] text-charcoal/55 truncate max-w-full">{row.lastErrorMessage}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </OperationalCard>
    </div>
  );
}
