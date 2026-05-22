import Link from "next/link";
import GovPageHeader from "@/components/governance/GovPageHeader";
import LiveActivityWorkspace from "@/components/super-admin/live/LiveActivityWorkspace";
import { LIVE_ACTIVITY_FILTER_IDS, type LiveActivityFilterId } from "@/lib/liveActivity/liveActivityFilters";
import { queryLiveActivityFeed } from "@/lib/liveActivity/queryLiveActivityFeed";
import { queryLiveActivitySnapshots } from "@/lib/liveActivity/queryLiveActivitySnapshots";
import { OPS_ENTITY_UUID_RE } from "@/lib/operations/operationalContextLinks";

export const dynamic = "force-dynamic";

function parseIncidentCorrelationId(raw?: string): string | undefined {
  const t = raw?.trim() ?? "";
  if (t.length < 10 || !/^[a-z][a-z0-9_-]*$/i.test(t)) return undefined;
  return t;
}

export default async function SuperAdminLiveActivityPage({
  searchParams,
}: {
  searchParams?: Promise<{ commerceOrderId?: string; filter?: string; incidentId?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const cand = typeof sp.commerceOrderId === "string" ? sp.commerceOrderId.trim() : "";
  const commerceOrderId = OPS_ENTITY_UUID_RE.test(cand) ? cand : undefined;

  const incidentCorrelationId = parseIncidentCorrelationId(
    typeof sp.incidentId === "string" ? sp.incidentId : undefined
  );
  const filterRaw = typeof sp.filter === "string" ? sp.filter : undefined;
  const filterOpt = LIVE_ACTIVITY_FILTER_IDS.includes(filterRaw as LiveActivityFilterId)
    ? (filterRaw as LiveActivityFilterId)
    : undefined;

  const [initialFeed, initialSnapshots] = await Promise.all([
    queryLiveActivityFeed({
      limit: 50,
      commerceOrderId,
      incidentId: incidentCorrelationId,
      filter: filterOpt,
    }),
    queryLiveActivitySnapshots(),
  ]);

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Command center · Live"
        title="Live activity"
        subtitle={
          commerceOrderId
            ? `Feed scoped to commerce order · ${commerceOrderId.slice(0, 8)}… — filter chips still apply locally.`
            :
              incidentCorrelationId
              ?
                `Incident-correlated OperationalActivity envelope slice (${incidentCorrelationId.slice(0, 10)}…).`
              : "Operational timeline with client polling over Postgres-backed events — no synthetic drill metrics."
        }
        actions={
          <>
            <Link
              href="/super-admin/incidents"
              className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Incidents
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

      <LiveActivityWorkspace
        initialFeed={initialFeed}
        initialSnapshots={initialSnapshots}
        commerceOrderId={commerceOrderId}
        incidentId={incidentCorrelationId}
        initialServerFilter={filterOpt}
      />
    </div>
  );
}
