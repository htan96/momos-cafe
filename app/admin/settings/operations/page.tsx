import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import { opsLoadSettingsSnapshot } from "@/lib/ops/queries";

export const dynamic = "force-dynamic";

export default async function AdminSettingsOperationsPage() {
  const snap = await opsLoadSettingsSnapshot();
  const stats = snap.catalogSync?.lastSyncStats as Record<string, unknown> | null | undefined;

  return (
    <div className="space-y-8">
      <OpsPageHeader
        title="Operations defaults"
        subtitle="Timer and batch thresholds remain unmodeled — read-only telemetry replaces the retired `/ops/settings` console."
      />

      <OpsPanel title="Catalog & orchestration telemetry" eyebrow="Read-only Postgres">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-[13px] font-semibold text-charcoal">Catalog sync</h3>
            <p className="text-[12px] text-charcoal/65">
              Backed by <span className="font-mono text-[12px]">CatalogSyncState</span> + authenticated Square workers.
            </p>
            <div className="flex flex-wrap gap-2">
              <OpsStatusPill variant={snap.catalogSync?.lastFullSyncAt ? "delivered" : "blocked"}>
                {snap.catalogSync?.lastFullSyncAt ? "Synced before" : "Never synced"}
              </OpsStatusPill>
              <OpsStatusPill variant={snap.catalogSync?.storeCategorySquareId ? "in_progress" : "blocked"}>
                {snap.catalogSync?.storeCategorySquareId ? "Store root bound" : "Store root missing"}
              </OpsStatusPill>
            </div>
            <dl className="text-[12px] space-y-2 text-charcoal/80">
              <div className="flex justify-between gap-4">
                <dt className="font-mono text-[11px] text-charcoal/50">last_full_sync_at</dt>
                <dd>{snap.catalogSync?.lastFullSyncAt?.toISOString() ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-mono text-[11px] text-charcoal/50">store_category_square_id</dt>
                <dd className="truncate max-w-[200px]">{snap.catalogSync?.storeCategorySquareId ?? "—"}</dd>
              </div>
            </dl>
            {stats && Object.keys(stats).length > 0 ?
              <pre className="text-[11px] bg-cream/65 rounded-lg p-3 overflow-auto max-h-48 text-charcoal/82">
                {JSON.stringify(stats, null, 2)}
              </pre>
            : <p className="text-[12px] text-charcoal/52">No JSON stats payload on catalog sync state.</p>}
            <p className="text-[11px] text-charcoal/52 leading-relaxed">
              Trigger catalog sync only via <span className="font-mono">POST /api/square/catalog/sync</span> plus{" "}
              <span className="font-mono">INTERNAL_API_SECRET</span>.
            </p>
          </div>
          <div className="space-y-3 border-t lg:border-t-0 lg:border-l border-cream-dark/65 lg:pl-8 pt-6 lg:pt-0">
            <h3 className="text-[13px] font-semibold text-charcoal">Communications & orchestration</h3>
            <dl className="text-[12px] space-y-2 text-charcoal/82">
              <div className="flex justify-between gap-4">
                <dt>Failed outbound messages</dt>
                <dd className="font-semibold text-charcoal">{snap.failedOutbound}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Unprocessed notification_events</dt>
                <dd className="font-semibold text-charcoal">{snap.pendingOrchestrationEvents}</dd>
              </div>
            </dl>
            <p className="text-[11px] text-charcoal/55 leading-relaxed">
              SES / Square webhooks use provider-native verification — SES inbound keeps separate SNS allow-lists documented in infra
              playbooks.
            </p>
          </div>
        </div>
      </OpsPanel>

      <OpsPanel title="Pack & label policy" eyebrow="Not modeled in admin tables">
        <p className="text-[13px] text-charcoal/70 leading-relaxed max-w-[72ch]">
          Soft SLAs and batch orchestration percentages stay unauthored until they become configuration rows or telemetry-fed tiles.
          Optional Shippo safeguards are controlled purely through environment toggles referenced in `.env.example` — for example{" "}
          <span className="font-mono">SHIPPO_REQUIRE_FULFILLMENT_APPROVAL</span> stamps <span className="font-mono">fulfillment_approved_at</span>{" "}
          before `/api/ops/shipping/purchase-label` buys a carrier label while super-admin recovery can bypass intentionally.
        </p>
      </OpsPanel>

      <OpsPanel title="Prep time templates" eyebrow="Kitchen + retail">
        <p className="text-[13px] text-charcoal/70 leading-relaxed max-w-[56ch]">
          Soft SLAs and batch orchestration percentages are deliberately omitted until they are authored as configuration rows (or surfaced from live telemetry aggregates).
        </p>
      </OpsPanel>

      <OpsPanel title="Prep time templates" eyebrow="Kitchen + retail">
        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
              Catering tray buffer
            </span>
            <input
              type="number"
              disabled
              className="rounded-lg border border-cream-dark bg-white/82 px-3 py-2.5 text-charcoal/60 cursor-not-allowed"
              placeholder="—"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">Retail staging</span>
            <input
              type="number"
              disabled
              className="rounded-lg border border-cream-dark bg-white/82 px-3 py-2.5 text-charcoal/60 cursor-not-allowed"
              placeholder="—"
            />
          </label>
        </div>
      </OpsPanel>

      <OpsPanel title="Escalation timers" eyebrow="Disabled">
        <div className="space-y-6 max-w-xl">
          <label className="grid gap-2">
            <span className="text-[12px] text-charcoal/70 flex justify-between">
              <span>Support soft cap</span>
              <span className="font-mono text-[11px] text-charcoal/45">Not persisted</span>
            </span>
            <input type="range" min={60} max={240} disabled className="w-full accent-teal-dark opacity-55 cursor-not-allowed" />
          </label>
          <label className="grid gap-2">
            <span className="text-[12px] text-charcoal/70 flex justify-between">
              <span>Label retry escalation</span>
              <span className="font-mono text-[11px] text-charcoal/45">Not persisted</span>
            </span>
            <input type="range" min={2} max={6} disabled className="w-full accent-teal-dark opacity-55 cursor-not-allowed" />
          </label>
        </div>
      </OpsPanel>
    </div>
  );
}
