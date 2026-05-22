import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import ShipmentExceptionRow from "@/components/operations/ShipmentExceptionRow";
import WorkflowTimeline from "@/components/operations/WorkflowTimeline";
import { loadAdminShippingContext } from "@/lib/admin/adminConsoleLoaders";

export default async function AdminShippingPage() {
  const ship = await loadAdminShippingContext();
  const lastSync = ship.settings?.lastFullSyncAt
    ? new Date(ship.settings.lastFullSyncAt).toLocaleString()
    : "No recorded sync";

  return (
    <div className="space-y-10">
      <OpsPageHeader
        title="Shipping & labels"
        subtitle="Operational counts and shipment timelines from Postgres — carrier preference matrices are enforced at checkout, not surfaced here yet."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <OpsPanel title="Catalog mirror" eyebrow="Square storefront category">
          <div className="flex justify-end mb-3">
            <OpsStatusPill variant={ship.settings?.storeCategorySquareId ? "delivered" : "muted"}>
              Config
            </OpsStatusPill>
          </div>
          <p className="text-[13px] text-charcoal/68 leading-relaxed">
            Last full sync · <span className="font-semibold text-charcoal">{lastSync}</span>
          </p>
        </OpsPanel>

        <OpsPanel title="Retail fulfillment" eyebrow="Open workloads">
          <p className="text-[28px] font-display text-charcoal">{ship.openRetailShipGroups}</p>
          <p className="text-[13px] text-charcoal/58 mt-2">Non-terminal retail fulfillment groups touching active orders.</p>
          <p className="text-[13px] text-charcoal mt-6">
            Pending labels · <span className="font-semibold text-charcoal">{ship.pendingLabelCount}</span>
          </p>
        </OpsPanel>

        <OpsPanel title="Exception depth" eyebrow={`${ship.exceptionRows.length} preview rows`}>
          <p className="text-[13px] text-charcoal/72 leading-relaxed">
            Ships in <span className="font-mono text-[12px]">exception</span> or{" "}
            <span className="font-mono text-[12px]">return_initiated</span> statuses appear below.
          </p>
          <div className="mt-4 flex justify-end">
            <OpsStatusPill variant={ship.timeline.length ? "in_progress" : "muted"}>Activity</OpsStatusPill>
          </div>
        </OpsPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkflowTimeline
          eyebrow="Operational events"
          title="Shipment-related activity"
          steps={
            ship.timeline.length > 0
              ? ship.timeline
              : [
                  {
                    id: "shipping-empty",
                    label: "No shipment events captured",
                    meta: "Types include webhook failures, carrier tracking deltas, label attempts.",
                    at: "—",
                    variant: "muted",
                  },
                ]
          }
        />
        <OpsPanel title="Routing context" eyebrow="Honest scopes">
          <p className="text-[13px] text-charcoal/68 leading-relaxed">
            Service selection and rate shopping happen when guests check out — we intentionally do not echo fixed “carrier
            tiles” from the database yet.
          </p>
          <ul className="mt-6 space-y-3 text-[12px] text-charcoal/60 list-disc list-inside">
            <li>Operational recovery lives alongside super-admin tooling.</li>
            <li>Use `/ops/shipping` for live queue inspection.</li>
          </ul>
        </OpsPanel>
      </div>

      <OpsPanel title="Retry / exceptions" eyebrow="Shipments · Prisma-backed">
        <div className="space-y-3">
          {ship.exceptionRows.length === 0 ? (
            <p className="text-[13px] text-charcoal/58">None in exception or return-initiated right now.</p>
          ) : (
            ship.exceptionRows.map((e) => <ShipmentExceptionRow key={e.id} {...e} />)
          )}
        </div>
      </OpsPanel>
    </div>
  );
}
