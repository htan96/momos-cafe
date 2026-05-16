import Link from "next/link";
import type { OperationalActivitySeverity } from "@prisma/client";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import { getMaintenanceFlags } from "@/lib/app-settings/settings";
import { getGovernanceControlMap } from "@/lib/governance/governanceControls";
import type { GovernanceControlKey } from "@/lib/governance/controlKeys";
import { OPERATIONAL_INCIDENT_ACTIVE_STATUSES } from "@/lib/operations/incidentTypes";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { PRESENCE_LIVE_WINDOW_MINUTES } from "@/lib/presence/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** High-signal operational timeline types (subset of emitted `OperationalActivityEvent.type`). */
const HIGH_SIGNAL_EVENT_TYPES: readonly string[] = [
  OPERATIONAL_EVENT_TYPES.MAINTENANCE_UPDATED,
  OPERATIONAL_EVENT_TYPES.PLATFORM_FEATURE_TOGGLED,
  OPERATIONAL_EVENT_TYPES.GOVERNANCE_CONTROL_UPDATED,
  OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED,
  OPERATIONAL_EVENT_TYPES.ORDER_CREATED,
  OPERATIONAL_EVENT_TYPES.CUSTOMER_REGISTERED,
  OPERATIONAL_EVENT_TYPES.SHIPMENT_LABEL_CREATED,
  OPERATIONAL_EVENT_TYPES.MENU_SYNCED,
  OPERATIONAL_EVENT_TYPES.PRESENCE_IMPERSONATION_STARTED,
  OPERATIONAL_EVENT_TYPES.PRESENCE_IMPERSONATION_ENDED,
];

const PENDING_COMMERCE_ORDER_STATUSES = ["draft", "pending_payment"] as const;

function startOfUtcDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
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

function deriveIntegrationPosture(rows: { currentStatus: string; systemKey: string }[]): {
  overallHealthy: boolean | null;
  degradedCount: number;
  offlineCount: number;
  unknownCount: number;
} {
  if (rows.length === 0) {
    return { overallHealthy: null, degradedCount: 0, offlineCount: 0, unknownCount: 0 };
  }
  let degradedCount = 0;
  let offlineCount = 0;
  let unknownCount = 0;
  for (const r of rows) {
    switch (r.currentStatus) {
      case "degraded":
        degradedCount += 1;
        break;
      case "offline":
        offlineCount += 1;
        break;
      case "unknown":
        unknownCount += 1;
        break;
      default:
        break;
    }
  }
  const overallHealthy = degradedCount === 0 && offlineCount === 0;
  return { overallHealthy, degradedCount, offlineCount, unknownCount };
}

export default async function SuperAdminHomePage() {
  const dayStartUtc = startOfUtcDay();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const presenceSince = new Date(Date.now() - PRESENCE_LIVE_WINDOW_MINUTES * 60 * 1000);

  const [
    maintenance,
    governanceMap,
    healthSnapshots,
    activeIncidentCount,
    incidentTitleRows,
    presenceGroups,
    ordersToday,
    pendingOrders,
    failedPayments24h,
    registrations24h,
    highSignalRows,
  ] = await Promise.all([
    getMaintenanceFlags(),
    getGovernanceControlMap(),
    prisma.integrationHealthSnapshot.findMany({
      select: { systemKey: true, currentStatus: true, category: true, updatedAt: true },
    }),
    prisma.operationalIncident.count({
      where: { status: { in: [...OPERATIONAL_INCIDENT_ACTIVE_STATUSES] } },
    }),
    prisma.operationalIncident.findMany({
      where: { status: { in: [...OPERATIONAL_INCIDENT_ACTIVE_STATUSES] } },
      orderBy: [{ lastDetectedAt: "desc" }, { updatedAt: "desc" }],
      take: 3,
      select: { title: true },
    }),
    prisma.platformPresenceSession.groupBy({
      by: ["userType"],
      where: {
        terminatedAt: null,
        lastActivityAt: { gte: presenceSince },
      },
      _count: { _all: true },
    }),
    prisma.commerceOrder.count({
      where: { createdAt: { gte: dayStartUtc } },
    }),
    prisma.commerceOrder.count({
      where: { status: { in: [...PENDING_COMMERCE_ORDER_STATUSES] } },
    }),
    prisma.operationalActivityEvent.count({
      where: {
        type: OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED,
        createdAt: { gte: since24h },
      },
    }),
    prisma.operationalActivityEvent.count({
      where: {
        type: OPERATIONAL_EVENT_TYPES.CUSTOMER_REGISTERED,
        createdAt: { gte: since24h },
      },
    }),
    prisma.operationalActivityEvent.findMany({
      where: { type: { in: [...HIGH_SIGNAL_EVENT_TYPES] } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        type: true,
        severity: true,
        message: true,
        createdAt: true,
        actorType: true,
        actorName: true,
        source: true,
      },
    }),
  ]);

  const { overallHealthy, degradedCount, offlineCount, unknownCount } = deriveIntegrationPosture(healthSnapshots);
  const integrationIssueCount = degradedCount + offlineCount;

  const presenceByType = Object.fromEntries(
    presenceGroups.map((g) => [g.userType, g._count._all])
  ) as Record<string, number>;
  const activeAdminPresence =
    (presenceByType.admin ?? 0) + (presenceByType.super_admin ?? 0);
  const activeCustomerPresence = presenceByType.customer ?? 0;

  const gc = governanceMap;
  const commerceKillSwitches: GovernanceControlKey[] = [
    "checkout_disabled",
    "ordering_disabled",
    "registrations_disabled",
    "storefront_read_only",
  ];
  const maintenanceGovernanceKeys: GovernanceControlKey[] = ["maintenance_mode", "menu_hidden"];
  const commerceGovernanceActive = commerceKillSwitches.some((k) => gc[k]);
  const maintenanceGovernanceActive = maintenanceGovernanceKeys.some((k) => gc[k]);
  const storefrontGatesClosed = !maintenance.shopEnabled || !maintenance.menuEnabled;

  const showCriticalAlerts =
    activeIncidentCount > 0 ||
    integrationIssueCount > 0 ||
    commerceGovernanceActive ||
    maintenanceGovernanceActive ||
    storefrontGatesClosed;

  const criticalBullets: string[] = [];

  if (activeIncidentCount > 0) {
    const titles = incidentTitleRows.map((r) => r.title).filter(Boolean);
    criticalBullets.push(
      titles.length
        ? `${activeIncidentCount} active incident${activeIncidentCount === 1 ? "" : "s"} — ${titles.join(" · ")}`
        : `${activeIncidentCount} active incident${activeIncidentCount === 1 ? "" : "s"}`
    );
  }
  if (degradedCount > 0) {
    criticalBullets.push(
      `${degradedCount} integration${degradedCount === 1 ? "" : "s"} degraded (see Live operations for detail)`
    );
  }
  if (offlineCount > 0) {
    criticalBullets.push(
      `${offlineCount} integration${offlineCount === 1 ? "" : "s"} offline (see Live operations for detail)`
    );
  }
  for (const key of commerceKillSwitches) {
    if (gc[key]) {
      criticalBullets.push(`Governance: ${key.replace(/_/g, " ")} is on`);
    }
  }
  for (const key of maintenanceGovernanceKeys) {
    if (gc[key]) {
      criticalBullets.push(`Governance: ${key.replace(/_/g, " ")} is on`);
    }
  }
  if (!maintenance.shopEnabled) {
    criticalBullets.push("Storefront: retail shop gate is closed (AppSetting)");
  }
  if (!maintenance.menuEnabled) {
    criticalBullets.push("Storefront: café menu gate is closed (AppSetting)");
  }

  const healthPillVariant: StatusPillVariant =
    overallHealthy === null ? "warning" : overallHealthy ? "neutral" : offlineCount > 0 ? "critical" : "degraded";

  const healthPillShort =
    overallHealthy === null ? "No data" : overallHealthy ? "Healthy" : offlineCount > 0 ? "Offline" : "Degraded";

  const healthDetail =
    overallHealthy === null
      ? "No integration health snapshots yet — run checks from Live operations after deploy."
      : overallHealthy
        ? "All systems report healthy or unknown (unknown is neutral)."
        : offlineCount > 0
          ? "At least one integration is offline."
          : "At least one integration is degraded.";

  return (
    <div className="space-y-10">
      <GovPageHeader
        eyebrow="Platform"
        title="Overview"
        subtitle="Executive summary from Postgres — integration snapshots, incidents, governance, presence, and commerce counters. Open Live operations for deep views and on-demand health probes."
      />

      {/* Section 1 — Platform status strip */}
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[140px] flex-1 rounded-xl border border-cream-dark/60 bg-white/[0.92] px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mb-2">Overall health</p>
          <StatusPill variant={healthPillVariant}>{healthPillShort}</StatusPill>
          <p className="text-[11px] text-charcoal/55 mt-2 leading-snug">{healthDetail}</p>
          {healthSnapshots.length > 0 ? (
            <p className="text-[11px] text-charcoal/50 mt-1 tabular-nums">
              {unknownCount} unknown · {degradedCount} degraded · {offlineCount} offline
            </p>
          ) : null}
        </div>
        <div className="min-w-[140px] flex-1 rounded-xl border border-cream-dark/60 bg-white/[0.92] px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mb-2">Incidents</p>
          <p className="font-display text-2xl text-teal-dark tabular-nums">{activeIncidentCount}</p>
          <p className="text-[11px] text-charcoal/55 mt-1 line-clamp-2">
            {incidentTitleRows.length
              ? incidentTitleRows.map((r) => r.title).join(" · ")
              : activeIncidentCount === 0
                ? "None active"
                : ""}
          </p>
        </div>
        <div className="min-w-[120px] flex-1 rounded-xl border border-cream-dark/60 bg-white/[0.92] px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mb-2">Orders today</p>
          <p className="font-display text-2xl text-teal-dark tabular-nums">{ordersToday}</p>
          <p className="text-[11px] text-charcoal/50 mt-1">UTC day · CommerceOrder</p>
        </div>
        <div className="min-w-[120px] flex-1 rounded-xl border border-cream-dark/60 bg-white/[0.92] px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mb-2">Active admins</p>
          <p className="font-display text-2xl text-teal-dark tabular-nums">{activeAdminPresence}</p>
          <p className="text-[11px] text-charcoal/50 mt-1">Presence · last {PRESENCE_LIVE_WINDOW_MINUTES} min</p>
        </div>
        <div className="min-w-[180px] flex-[1.2] rounded-xl border border-cream-dark/60 bg-white/[0.92] px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mb-2">Storefront gates</p>
          <p className="text-[13px] text-charcoal leading-snug">
            Shop {maintenance.shopEnabled ? "open" : "closed"} · Menu {maintenance.menuEnabled ? "open" : "closed"}
          </p>
          <p className="text-[11px] text-charcoal/45 mt-1">AppSetting ShopEnabled / MenuEnabled</p>
        </div>
      </div>

      {/* Section 2 — Critical alerts */}
      {showCriticalAlerts ? (
        <OperationalCard title="Critical alerts" meta="Action may be required">
          <ul className="list-disc pl-5 space-y-2 text-[13px] text-charcoal/80 leading-relaxed">
            {criticalBullets.map((line, i) => (
              <li key={`${i}-${line.slice(0, 48)}`}>{line}</li>
            ))}
          </ul>
        </OperationalCard>
      ) : null}

      {/* Section 3 — Operational snapshot */}
      <OperationalCard title="Operational snapshot" meta="Counts from live reads">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Orders</h3>
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-charcoal/60">Today (UTC)</dt>
                <dd className="font-medium tabular-nums text-charcoal">{ordersToday}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-charcoal/60">Pending (draft / awaiting payment)</dt>
                <dd className="font-medium tabular-nums text-charcoal">{pendingOrders}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-charcoal/60">Failed payments (24h)</dt>
                <dd className="font-medium tabular-nums text-charcoal">{failedPayments24h}</dd>
              </div>
            </dl>
          </div>
          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Customers</h3>
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-charcoal/60">New registrations (24h)</dt>
                <dd className="font-medium tabular-nums text-charcoal">{registrations24h}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-charcoal/60">Browsing now (presence)</dt>
                <dd className="font-medium tabular-nums text-charcoal">{activeCustomerPresence}</dd>
              </div>
            </dl>
          </div>
          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Operations</h3>
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-charcoal/60">Active incidents</dt>
                <dd className="font-medium tabular-nums text-charcoal">{activeIncidentCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-charcoal/60">Integration degraded / offline</dt>
                <dd className="font-medium tabular-nums text-charcoal">{integrationIssueCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-charcoal/60">Staff in console (recent)</dt>
                <dd className="font-medium tabular-nums text-charcoal">{activeAdminPresence}</dd>
              </div>
            </dl>
            <p className="text-[11px] text-charcoal/45 leading-relaxed">
              Counts `admin` + `super_admin` presence rows with activity in the last {PRESENCE_LIVE_WINDOW_MINUTES}{" "}
              minutes (`PlatformPresenceSession.lastActivityAt`).
            </p>
          </div>
        </div>
      </OperationalCard>

      {/* Section 4 — Quick actions */}
      <OperationalCard
        title="Quick actions"
        meta="Deep links"
        footer={
          <p className="text-[12px] text-charcoal/55">
            Maintenance toggles live in admin; governance kill switches in platform settings.
          </p>
        }
      >
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold text-teal-dark">
          <li>
            <Link href="/super-admin/live-operations" className="underline-offset-2 hover:underline">
              Live operations
            </Link>
          </li>
          <li>
            <Link href="/super-admin/live-operations#related-controls" className="underline-offset-2 hover:underline">
              Live operations · controls
            </Link>
          </li>
          <li>
            <Link href="/admin/settings/maintenance" className="underline-offset-2 hover:underline">
              Maintenance (shop / menu gates)
            </Link>
          </li>
          <li>
            <Link href="/super-admin/settings/platform" className="underline-offset-2 hover:underline">
              Platform governance
            </Link>
          </li>
        </ul>
      </OperationalCard>

      {/* Section 5 — High-signal activity */}
      <OperationalCard title="High-signal activity" meta="Last 12 matching events · newest first">
        {highSignalRows.length === 0 ? (
          <p className="text-[13px] text-charcoal/60 leading-relaxed">
            No matching operational events yet — types include maintenance, governance, payments, orders, and sign-ups.
          </p>
        ) : (
          <ul className="divide-y divide-cream-dark/40">
            {highSignalRows.map((row) => (
              <li key={row.id} className="py-4 first:pt-0 flex flex-col gap-2">
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
                {(row.actorType || row.actorName || row.source) && (
                  <p className="text-[12px] text-charcoal/55">
                    {[row.actorType, row.actorName, row.source].filter(Boolean).join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </OperationalCard>
    </div>
  );
}
