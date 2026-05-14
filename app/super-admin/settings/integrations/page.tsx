import GovPageHeader from "@/components/governance/GovPageHeader";
import IntegrationTile from "@/components/governance/IntegrationTile";
import OperationalCard from "@/components/governance/OperationalCard";
import MetricQuiet from "@/components/governance/MetricQuiet";
import { mockOutboundEmailLanes, mockWebhookDeliveryStats } from "@/lib/governance/mockSuperAdmin";

export default function SuperAdminSettingsIntegrationsPage() {
  return (
    <div className="space-y-10">
      <GovPageHeader
        eyebrow="Settings · Integrations"
        title="Connectivity fabric"
        subtitle="Outbound carriers, relays, and webhooks anchored to audited credentials — presentation only."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <IntegrationTile name="Shippo" envLabel="Primary · labels" status="ok" statusLabel="Live" lastSyncLine="Negotiated rates + batch manifest export healthy." />
        <IntegrationTile name="SMTP relay" envLabel="Marketing + tx" status="degraded" statusLabel="Backoff" lastSyncLine="Burst queue shedding · receipts still SLA-green." />
        <IntegrationTile name="Webhooks" envLabel="HMAC-signed" status="ok" statusLabel="Stable" lastSyncLine="Listener regions iad · backup ord standby." />
      </div>

      <OperationalCard title="Outbound email lanes" meta="Abstraction placeholders">
        <div className="grid sm:grid-cols-3 gap-4">
          {mockOutboundEmailLanes.map((lane) => (
            <div key={lane.name} className="rounded-xl border border-cream-dark/60 bg-cream-mid/20 p-4">
              <p className="font-display text-[17px] text-teal-dark">{lane.name}</p>
              <p className="text-[12px] text-charcoal/62 mt-2 leading-relaxed">{lane.detail}</p>
            </div>
          ))}
        </div>
      </OperationalCard>

      <OperationalCard title="Webhook delivery (24h window)" footer={<p className="text-[11px] text-charcoal/45">Stats mimic observability dashboards without external calls.</p>}>
        <div className="max-w-md">
          {mockWebhookDeliveryStats.map((row) => (
            <MetricQuiet key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
        <p className="mt-4 text-[13px] text-charcoal/60 leading-relaxed">
          Replay controls, signing secret fingerprints, and per-endpoint backoff curves land in the drawer pattern next pass.
        </p>
      </OperationalCard>
    </div>
  );
}
