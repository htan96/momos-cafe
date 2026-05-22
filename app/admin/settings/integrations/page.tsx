import Link from "next/link";
import OpsIntegrationTile from "@/components/operations/OpsIntegrationTile";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import { opsLoadSettingsSnapshot } from "@/lib/ops/queries";

export default async function AdminSettingsIntegrationsPage() {
  const snap = await opsLoadSettingsSnapshot();
  const lastSync = snap.catalogSync?.lastFullSyncAt
    ? new Date(snap.catalogSync.lastFullSyncAt).toLocaleString()
    : "No recorded Square catalog sync timestamp";

  return (
    <div className="space-y-8">
      <OpsPageHeader
        title="Operational integrations"
        subtitle="Operational presence flags — OAuth secrets and uptime percents intentionally omitted."
      />

      <div className="flex flex-wrap gap-3 rounded-xl border border-cream-dark/70 bg-white/82 px-4 py-3 text-[13px] text-charcoal/70">
        <span>Outbound labels orchestration:</span>
        <Link href="/admin/shipping" className="font-semibold text-teal-dark hover:underline underline-offset-2">
          Shipping workbench →
        </Link>
      </div>

      <OpsPanel eyebrow="Catalog snapshot" title="Tiles">
        <div className="flex flex-wrap gap-4">
          <OpsIntegrationTile
            name="Shippo labeling"
            hint="Operational child account"
            statusVariant={snap.pendingOrchestrationEvents > 0 ? "scheduled" : "delivered"}
            statusLabel="Orchestration backlog"
            detail={`Pending NotificationEvent rows · ${snap.pendingOrchestrationEvents}`}
          />
          <OpsIntegrationTile
            name="Square catalog"
            hint="Inventory + menu feed"
            statusVariant={snap.catalogSync?.lastFullSyncAt ? "delivered" : "scheduled"}
            statusLabel="Mirror state"
            detail={`Last full sync · ${lastSync}`}
          />
          <OpsIntegrationTile
            name="Staff email relay"
            hint="Resend-compatible transport"
            statusVariant={snap.failedOutbound ? "blocked" : "delivered"}
            statusLabel={snap.failedOutbound ? "Failures present" : "No failed outbound count"}
            detail={`Outbound EmailMessage.failed · ${snap.failedOutbound}`}
          />
          <OpsIntegrationTile
            name="Operational webhooks"
            hint="PSP · carrier ingestion"
            statusVariant="muted"
            statusLabel="Receipts tracked elsewhere"
            detail="Webhook health is summarized via WebhookDeliveryReceipt + operational failures tooling — no synthetic retry charts here."
          />
        </div>
      </OpsPanel>
    </div>
  );
}
