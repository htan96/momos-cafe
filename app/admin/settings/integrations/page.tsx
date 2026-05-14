import Link from "next/link";
import OpsIntegrationTile from "@/components/operations/OpsIntegrationTile";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";

export default function AdminSettingsIntegrationsPage() {
  return (
    <div className="space-y-8">
      <OpsPageHeader
        title="Operational integrations"
        subtitle="Mirrors governance tile patterns with ops semantics — no secrets exposed in UI."
      />

      <div className="flex flex-wrap gap-3 rounded-xl border border-cream-dark/70 bg-white/82 px-4 py-3 text-[13px] text-charcoal/70">
        <span>Outbound labels orchestration:</span>
        <Link href="/admin/shipping" className="font-semibold text-teal-dark hover:underline underline-offset-2">
          Shipping workbench →
        </Link>
      </div>

      <OpsPanel eyebrow="Connected systems · mock tokens" title="Tiles">
        <div className="flex flex-wrap gap-4">
          <OpsIntegrationTile
            name="Shippo labeling"
            hint="Operational child account"
            statusVariant="in_progress"
            statusLabel="Auth ok"
            detail="Rate shop latency watch · webhook retries surfaced in Notifications."
          />
          <OpsIntegrationTile
            name="Square catalog"
            hint="Inventory + menu feed"
            statusVariant="scheduled"
            statusLabel="Polling"
            detail="Mock sync jitter — SKU publishing states echo Catalog admin."
          />
          <OpsIntegrationTile
            name="Staff email relay"
            hint="Resend-compatible transport"
            statusVariant="delivered"
            statusLabel="Warm"
            detail="Operational templates guarded server-side · communications timeline references threads."
          />
          <OpsIntegrationTile
            name="Observability webhooks"
            hint="Ops alerting bus"
            statusVariant="exception"
            detail="Delayed payload sample — aligns with Notifications · Finance bucket."
          />
        </div>
      </OpsPanel>
    </div>
  );
}
