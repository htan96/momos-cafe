import Link from "next/link";
import type { OperationalActivityEvent, OperationalActivitySeverity } from "@prisma/client";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalMetadataJumpLinks from "@/components/governance/OperationalMetadataJumpLinks";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import { INTEGRATION_HEALTH_DISPLAY_ORDER } from "@/lib/operations/integrationHealth/types";
import {
  persistIntegrationHealthSnapshots,
  runIntegrationHealthChecks,
} from "@/lib/operations/integrationHealth/runIntegrationHealthChecks";
import { PRESENCE_LIVE_WINDOW_MINUTES } from "@/lib/presence/constants";
import { prisma } from "@/lib/prisma";
import RunIntegrationHealthChecksButton from "./RunIntegrationHealthChecksButton";
import { ensureGovernanceControls } from "@/lib/governance/governanceControls";
import {
  GOVERNANCE_CONTROL_DEFINITIONS,
  type GovernanceControlKey,
} from "@/lib/governance/controlKeys";
import { OPERATIONAL_INCIDENT_ACTIVE_STATUSES } from "@/lib/operations/incidentTypes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

function incidentSeverityPillVariant(sev: string): StatusPillVariant {
  switch (sev) {
    case "info":
      return "neutral";
    case "warning":
      return "warning";
    case "high":
      return "degraded";
    case "critical":
      return "critical";
    default:
      return "neutral";
  }
}

function incidentBorderClass(sev: string): string {
  switch (sev) {
    case "critical":
      return "border-l-4 border-l-red-dark";
    case "high":
      return "border-l-4 border-l-amber-700";
    case "warning":
      return "border-l-4 border-l-amber-400";
    default:
      return "border-l-4 border-l-charcoal/15";
  }
}

function healthPillVariant(status: string): StatusPillVariant {
  switch (status) {
    case "healthy":
      return "neutral";
    case "degraded":
      return "degraded";
    case "offline":
      return "critical";
    case "unknown":
      return "warning";
    default:
      return "neutral";
  }
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
            {[
              row.actorType,
              row.actorId
                ? `id:${row.actorId.slice(0, 12)}${row.actorId.length > 12 ? "..." : ""}`
                : null,
              row.actorName,
              row.source,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <OperationalMetadataJumpLinks metadata={row.metadata} />
      </div>
    </li>
  );
}

export default async function SuperAdminLiveOperationsPage() {
  /** Single heavy probe run per request; snapshots power the health grid. */
  const checkResults = await runIntegrationHealthChecks();
  await persistIntegrationHealthSnapshots(checkResults);

  await ensureGovernanceControls();

  const liveSince = new Date(Date.now() - PRESENCE_LIVE_WINDOW_MINUTES * 60 * 1000);

  const [events, activeIncidents, resolvedIncidents, healthRows, presenceSessions, governanceControls, activeImpersonations] =
    await Promise.all([
      prisma.operationalActivityEvent.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
      prisma.operationalIncident.findMany({
        where: { status: { in: [...OPERATIONAL_INCIDENT_ACTIVE_STATUSES] } },
        orderBy: { lastDetectedAt: "desc" },
      }),
      prisma.operationalIncident.findMany({
        where: { status: "resolved" },
        orderBy: { lastDetectedAt: "desc" },
        take: 20,
      }),
      prisma.integrationHealthSnapshot.findMany({
        where: { systemKey: { in: [...INTEGRATION_HEALTH_DISPLAY_ORDER] } },
      }),
      prisma.platformPresenceSession.findMany({
        where: {
          terminatedAt: null,
          lastActivityAt: { gte: liveSince },
        },
        orderBy: { lastActivityAt: "desc" },
        take: 100,
      }),
      prisma.platformGovernanceControl.findMany({ orderBy: { key: "asc" } }),
      prisma.impersonationSupportSession.findMany({
        where: {
          endedAt: null,
          startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { startedAt: "desc" },
        take: 50,
      }),
    ]);

  const [platformFeatureToggles, appSettings] =
    governanceControls.length === 0
      ? await Promise.all([
          prisma.platformFeatureToggle.findMany({ orderBy: { key: "asc" } }),
          prisma.appSetting.findMany({ orderBy: { settingId: "asc" } }),
        ])
      : [[], []];

  const healthByKey = new Map(healthRows.map((r) => [r.systemKey, r]));
  const healthOrdered = INTEGRATION_HEALTH_DISPLAY_ORDER.map((k) => healthByKey.get(k)).filter(
    (r): r is (typeof healthRows)[number] => r != null
  );

  const activeGovernanceControls = governanceControls.filter((c) => c.enabled);
  const governanceSummaryLine =
    activeGovernanceControls.length === 0
      ? "Governance restrictions: none active."
      : `Governance restrictions on: ${activeGovernanceControls
          .map(
            (c) =>
              GOVERNANCE_CONTROL_DEFINITIONS[c.key as GovernanceControlKey]?.title ??
              c.key
          )
          .join(" · ")}`;

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Platform · Operations"
        title="Live Operations"
        subtitle="DB-backed views: activity timeline, incidents, integration probes, presence, and governance flags."
        actions={
          <Link
            href="/super-admin/audit"
            className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
          >
            Audit log
          </Link>
        }
      />

      <p className="text-[13px] leading-snug text-charcoal/72 border-l-2 border-amber-900/35 pl-3">
        {governanceSummaryLine}
      </p>

      <OperationalCard
        title="Live event stream"
        meta={`${events.length} / 100 · operational_activity_events`}
      >
        {events.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No events recorded yet.</p>
        ) : (
          <ul className="divide-y divide-cream-dark/40">
            {events.map((row) => (
              <OperationalActivityEventRow key={row.id} row={row} />
            ))}
          </ul>
        )}
      </OperationalCard>

      <OperationalCard
        title="Active incidents"
        meta={`operational_incidents · ${activeIncidents.length} live`}
      >
        <div className="space-y-6">
          {activeIncidents.length === 0 ? (
            <p className="text-[13px] text-charcoal/60">No active incidents.</p>
          ) : (
            <ul className="divide-y divide-cream-dark/40">
              {activeIncidents.map((row) => (
                <li
                  key={row.id}
                  className={`py-4 first:pt-0 pl-3 ${incidentBorderClass(row.severity)} flex flex-col gap-2`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill variant={incidentSeverityPillVariant(row.severity)}>
                      {row.severity}
                    </StatusPill>
                    <StatusPill variant="neutral">{row.status}</StatusPill>
                    <span className="text-[11px] font-mono text-charcoal/55 break-all">{row.type}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-charcoal leading-snug">{row.title}</p>
                  {row.description ? (
                    <p className="text-[13px] text-charcoal/70 leading-relaxed">{row.description}</p>
                  ) : null}
                  {row.affectedSystems.length > 0 ? (
                    <p className="text-[12px] text-charcoal/50">
                      Affected · {row.affectedSystems.join(", ")}
                    </p>
                  ) : null}
                  <OperationalMetadataJumpLinks metadata={row.metadata} />
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.08em] text-charcoal/40">
                    {row.firstDetectedAt ? (
                      <time dateTime={row.firstDetectedAt.toISOString()}>
                        First · {row.firstDetectedAt.toLocaleString()}
                      </time>
                    ) : null}
                    {row.lastDetectedAt ? (
                      <time dateTime={row.lastDetectedAt.toISOString()}>
                        Last · {row.lastDetectedAt.toLocaleString()}
                      </time>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {resolvedIncidents.length > 0 ? (
            <details className="rounded-md border border-cream-dark/50 bg-white/60 px-3 py-2">
              <summary className="cursor-pointer select-none text-[12px] font-semibold text-charcoal/70">
                Resolved (showing {resolvedIncidents.length} of latest)
              </summary>
              <ul className="mt-3 divide-y divide-cream-dark/40">
                {resolvedIncidents.map((row) => (
                  <li key={row.id} className="py-3 first:pt-0 flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill variant={incidentSeverityPillVariant(row.severity)}>
                        {row.severity}
                      </StatusPill>
                      <span className="text-[11px] font-mono text-charcoal/45">{row.type}</span>
                    </div>
                    <p className="text-[13px] text-charcoal/80">{row.title}</p>
                    {row.resolvedAt ? (
                      <time className="text-[11px] text-charcoal/40" dateTime={row.resolvedAt.toISOString()}>
                        Resolved {row.resolvedAt.toLocaleString()}
                      </time>
                    ) : null}
                    <OperationalMetadataJumpLinks metadata={row.metadata} />
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </OperationalCard>

      <OperationalCard
        title="System health"
        meta={
          <span className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-charcoal/45">
              integration_health_snapshots
            </span>
            <RunIntegrationHealthChecksButton />
          </span>
        }
      >
        {healthOrdered.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No integration health rows in Postgres yet.</p>
        ) : (
          <ul className="divide-y divide-cream-dark/40">
            {healthOrdered.map((row) => (
              <li key={row.systemKey} className="py-4 first:pt-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono text-charcoal/55">{row.systemKey}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45">
                    {row.category}
                  </span>
                  <StatusPill variant={healthPillVariant(row.currentStatus)}>{row.currentStatus}</StatusPill>
                </div>
                <p className="text-[13px] text-charcoal leading-snug">
                  {row.latencyMs != null ? `Measured latency: ${row.latencyMs} ms` : "Latency: —"}
                </p>
                {row.lastErrorMessage ? (
                  <p className="text-[12px] text-charcoal/65 leading-relaxed break-words">
                    Last error: {row.lastErrorMessage}
                  </p>
                ) : null}
                <p className="text-[11px] text-charcoal/50">
                  Updated{" "}
                  {row.updatedAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </OperationalCard>

      <OperationalCard
        title="Active impersonation (support)"
        meta={`impersonation_support_sessions · open · last 24h · ${activeImpersonations.length} / 50`}
      >
        {activeImpersonations.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No open impersonation ledger rows in the last 24 hours.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
            <table className="w-full min-w-[40rem] text-left text-[13px]">
              <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                <tr>
                  <th className="px-3 py-2 font-semibold">Actor</th>
                  <th className="px-3 py-2 font-semibold">Target</th>
                  <th className="px-3 py-2 font-semibold">Scope</th>
                  <th className="px-3 py-2 font-semibold">Started</th>
                  <th className="px-3 py-2 font-semibold">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/40">
                {activeImpersonations.map((row) => (
                  <tr key={row.id} className="bg-white/80">
                    <td className="px-3 py-2 align-top">
                      <p className="text-charcoal break-all">{row.actorEmail}</p>
                      <p className="text-[11px] font-mono text-charcoal/50 break-all">{row.actorSub}</p>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <p className="text-charcoal break-all">{row.targetEmail}</p>
                      {row.targetSub ? (
                        <p className="text-[11px] font-mono text-charcoal/50 break-all">{row.targetSub}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <StatusPill variant="warning">{row.scope}</StatusPill>
                    </td>
                    <td className="px-3 py-2 align-top text-[12px] text-charcoal/75 whitespace-nowrap">
                      {row.startedAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-3 py-2 align-top font-mono text-[11px] text-charcoal/55 break-all">
                      {row.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OperationalCard>

      <OperationalCard
        title="Active sessions"
        meta={`platform_presence_sessions · last ${PRESENCE_LIVE_WINDOW_MINUTES}m · ${presenceSessions.length} / 100`}
      >
        {presenceSessions.length === 0 ? (
          <p className="text-[13px] text-charcoal/60">No sessions within the live activity window.</p>
        ) : (
          <ul className="divide-y divide-cream-dark/40">
            {presenceSessions.map((row) => (
              <li key={row.id} className="py-3 first:pt-0 flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill variant="neutral">{row.userType}</StatusPill>
                    {row.userRole ? (
                      <span className="text-[11px] font-mono text-charcoal/50">{row.userRole}</span>
                    ) : null}
                    {row.isImpersonated ? <StatusPill variant="warning">Impersonated</StatusPill> : null}
                  </div>
                  <p className="text-[13px] text-charcoal">
                    {row.displayName ?? row.cognitoSub?.slice(0, 12) ?? row.sessionPublicId}
                  </p>
                  {row.currentRoute ? (
                    <p className="text-[11px] font-mono text-charcoal/55 break-all">{row.currentRoute}</p>
                  ) : null}
                </div>
                <time
                  className="shrink-0 text-[11px] text-charcoal/45"
                  dateTime={row.lastActivityAt.toISOString()}
                >
                  Last activity {row.lastActivityAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </OperationalCard>

      <div id="related-controls" className="scroll-mt-8">
        <OperationalCard title="Governance state" meta="platform_governance_controls">
        <div className="space-y-8">
          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">
              Platform governance controls
            </h3>
            {governanceControls.length === 0 ? (
              <p className="text-[13px] text-charcoal/60">No governance control rows in Postgres.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
                <table className="w-full min-w-[36rem] text-left text-[13px]">
                  <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Key</th>
                      <th className="px-3 py-2 font-semibold">Category</th>
                      <th className="px-3 py-2 font-semibold">Restriction</th>
                      <th className="px-3 py-2 font-semibold">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-dark/40">
                    {governanceControls.map((c) => (
                      <tr key={c.id} className="bg-white/80">
                        <td className="px-3 py-2 font-mono text-[12px] text-charcoal/80">{c.key}</td>
                        <td className="px-3 py-2 text-charcoal/70">{c.category}</td>
                        <td className="px-3 py-2">
                          <StatusPill variant={c.enabled ? "critical" : "neutral"}>
                            {c.enabled ? "Active" : "Off"}
                          </StatusPill>
                        </td>
                        <td className="px-3 py-2 text-[12px] text-charcoal/55">
                          {c.updatedAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[11px] text-charcoal/45 leading-relaxed">
              Active means the named platform restriction is on (see <code className="font-mono text-[11px]">controlKeys</code>
              ).
            </p>
          </div>

          {governanceControls.length === 0 ? (
            <div className="space-y-6 border-t border-cream-dark/40 pt-6">
              <p className="text-[12px] text-charcoal/55">
                No <span className="font-mono">platform_governance_controls</span> yet — showing consolidated toggles and app
                settings from Postgres.
              </p>
              <div className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">
                  Platform feature toggles
                </h3>
                {platformFeatureToggles.length === 0 ? (
                  <p className="text-[13px] text-charcoal/60">No feature toggle rows.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
                    <table className="w-full min-w-[28rem] text-left text-[13px]">
                      <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Key</th>
                          <th className="px-3 py-2 font-semibold">Enabled</th>
                          <th className="px-3 py-2 font-semibold">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream-dark/40">
                        {platformFeatureToggles.map((t) => (
                          <tr key={t.key} className="bg-white/80">
                            <td className="px-3 py-2 font-mono text-[12px] text-charcoal/80">{t.key}</td>
                            <td className="px-3 py-2">
                              <StatusPill variant={t.enabled ? "neutral" : "warning"}>
                                {t.enabled ? "On" : "Off"}
                              </StatusPill>
                            </td>
                            <td className="px-3 py-2 text-[12px] text-charcoal/55">
                              {t.updatedAt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">
                  App settings (storefront availability)
                </h3>
                {appSettings.length === 0 ? (
                  <p className="text-[13px] text-charcoal/60">No app setting rows.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-cream-dark/50">
                    <table className="w-full min-w-[28rem] text-left text-[13px]">
                      <thead className="border-b border-cream-dark/50 bg-cream-mid/20 text-[11px] uppercase tracking-[0.08em] text-charcoal/50">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Setting</th>
                          <th className="px-3 py-2 font-semibold">Open</th>
                          <th className="px-3 py-2 font-semibold">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream-dark/40">
                        {appSettings.map((s) => (
                          <tr key={s.settingId} className="bg-white/80">
                            <td className="px-3 py-2 font-mono text-[12px] text-charcoal/80">{s.settingId}</td>
                            <td className="px-3 py-2">
                              <StatusPill variant={s.enabled ? "neutral" : "warning"}>
                                {s.enabled ? "Yes" : "No"}
                              </StatusPill>
                            </td>
                            <td className="px-3 py-2 text-[12px] text-charcoal/55">
                              {s.lastUpdated.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
        </OperationalCard>
      </div>
    </div>
  );
}
