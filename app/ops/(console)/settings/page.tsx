import OpsPageHeader from "@/components/ops/OpsPageHeader";
import StateChip from "@/components/ops/StateChip";
import { opsLoadSettingsSnapshot } from "@/lib/ops/queries";

export default async function OpsSettingsPage() {
  const snap = await opsLoadSettingsSnapshot();

  const stats = snap.catalogSync?.lastSyncStats as Record<string, unknown> | null | undefined;

  return (
    <>
      <OpsPageHeader
        title="Settings & health"
        description="Read-only telemetry — dangerous controls stay behind orchestration secrets."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[#3d3830] bg-[#252119] p-5 space-y-3">
          <h2 className="text-[14px] font-semibold text-[#f5e5c0]">Catalog sync</h2>
          <p className="text-[12px] text-[#c9bba8]/85">
            Backed by <code className="text-[#8FC4C4]/90">CatalogSyncState</code> singleton + Square worker routes.
          </p>
          <div className="flex flex-wrap gap-2">
            <StateChip
              label={snap.catalogSync?.lastFullSyncAt ? "Synced before" : "Never synced"}
              tone={snap.catalogSync?.lastFullSyncAt ? "ok" : "warn"}
            />
            {snap.catalogSync?.storeCategorySquareId ? (
              <StateChip label="Store root bound" tone="neutral" />
            ) : (
              <StateChip label="Store root missing" tone="danger" />
            )}
          </div>
          <dl className="text-[12px] space-y-1 text-[#c9bba8]/90">
            <div className="flex justify-between gap-4">
              <dt>last_full_sync_at</dt>
              <dd>{snap.catalogSync?.lastFullSyncAt?.toISOString() ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>store_category_square_id</dt>
              <dd className="truncate max-w-[180px]">
                {snap.catalogSync?.storeCategorySquareId ?? "—"}
              </dd>
            </div>
          </dl>
          {stats && Object.keys(stats).length > 0 ? (
            <pre className="text-[11px] bg-[#1c1916] rounded-md p-3 overflow-auto max-h-48 text-[#c9bba8]/80">
              {JSON.stringify(stats, null, 2)}
            </pre>
          ) : (
            <p className="text-[12px] text-[#c9bba8]/70">No last_sync_stats payload.</p>
          )}
          <p className="text-[11px] text-[#c9bba8]/65 leading-relaxed">
            Trigger sync only via authenticated orchestration:{" "}
            <code className="text-[#8FC4C4]/90">POST /api/square/catalog/sync</code> with{" "}
            <code className="text-[#8FC4C4]/90">INTERNAL_API_SECRET</code> — never expose from this UI.
            Architecture notes:{" "}
            <code className="text-[#8FC4C4]/90">/var/www/htworks/momos/docs/SQUARE_CATALOG_ARCHITECTURE.md</code>.
          </p>
        </section>

        <section className="rounded-lg border border-[#3d3830] bg-[#252119] p-5 space-y-3">
          <h2 className="text-[14px] font-semibold text-[#f5e5c0]">Communications & orchestration</h2>
          <dl className="text-[12px] space-y-2 text-[#c9bba8]/90">
            <div className="flex justify-between gap-4">
              <dt>Failed outbound messages</dt>
              <dd>{snap.failedOutbound}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Unprocessed notification_events</dt>
              <dd>{snap.pendingOrchestrationEvents}</dd>
            </div>
          </dl>
          <p className="text-[11px] text-[#c9bba8]/65 leading-relaxed">
            Square webhooks authenticate independently via Svix signing — errors surface through logs and optional{" "}
            <code className="text-[#8FC4C4]/90">notification_events</code> producers.
          </p>
        </section>
      </div>
    </>
  );
}
