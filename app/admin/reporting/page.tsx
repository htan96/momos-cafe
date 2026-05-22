import OpsMetricQuiet from "@/components/operations/OpsMetricQuiet";
import OpsPageHeader from "@/components/operations/OpsPageHeader";
import OpsPanel from "@/components/operations/OpsPanel";
import { loadAdminReportingCounts } from "@/lib/admin/adminConsoleLoaders";

export default async function AdminReportingPage() {
  const c = await loadAdminReportingCounts();

  return (
    <div className="space-y-8">
      <OpsPageHeader
        title="Operational reporting"
        subtitle="Coarse Postgres counts only — SLA attainment and percentile charts remain unmodeled intentionally."
      />

      <OpsPanel eyebrow="Today (UTC midnight onwards)" title="Throughput snapshot · payments lens">
        <div className="grid gap-3 sm:grid-cols-3">
          <OpsMetricQuiet
            label="Payment posture failures · today UTC"
            value={String(c.paymentFailuresToday)}
            hint={`${c.paymentFailuresToday} logged payment failures + register misses`}
          />
          <OpsMetricQuiet label="Notification backlog" value={String(c.notificationBacklog)} hint="ProcessedAt IS NULL on NotificationEvent" />
          <OpsMetricQuiet label="Failed email deliveries" value={String(c.failedEmailMessages)} hint="Lifetime failed EmailMessage rows" />
        </div>
      </OpsPanel>

      <div className="grid gap-5 lg:grid-cols-2">
        <OpsPanel title="Fulfillment friction" eyebrow="Open workloads">
          <ul className="space-y-3 text-[14px] text-charcoal leading-relaxed">
            <li>Open fulfillment groups · {c.openFulfillmentGroups}</li>
            <li>Pending label shipments · {c.pendingLabelShipments}</li>
            <li>Shipments flagged exception / returns · {c.shipmentExceptions}</li>
          </ul>
        </OpsPanel>

        <OpsPanel title="Desk workloads" eyebrow="Support + finance shells">
          <ul className="space-y-3 text-[14px] text-charcoal leading-relaxed">
            <li>OperationalSupportIssue (open) · {c.openSupport}</li>
            <li>OperationalRefundCase (active) · {c.openRefunds}</li>
          </ul>
        </OpsPanel>
      </div>
    </div>
  );
}
