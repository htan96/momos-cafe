import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalBreadcrumbs from "@/components/super-admin/operations/OperationalBreadcrumbs";
import OperationalCrossLinks from "@/components/super-admin/operations/OperationalCrossLinks";
import OperationalEscalationBanner from "@/components/super-admin/operations/OperationalEscalationBanner";
import { webhookReplayIncidentContext } from "@/components/super-admin/operations/operationalIncidentPresets";
import { superAdminOperationsBreadcrumbs } from "@/components/super-admin/operations/superAdminOperationsBreadcrumbs";
import WebhookReplayConsole from "@/components/super-admin/operations/webhook-replay/WebhookReplayConsole";import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OperationalWebhookReplayPage({
  searchParams,
}: {
  searchParams?: Promise<{ receiptId?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const initialReceiptId = typeof sp.receiptId === "string" ? sp.receiptId.trim() : null;

  const pendingNotifications = await prisma.notificationEvent.findMany({
    where: { processedAt: null },
    orderBy: { createdAt: "asc" },
    take: 25,
    select: {
      id: true,
      type: true,
      createdAt: true,
      startedProcessingAt: true,
      processedAt: true,
      payload: true,
    },
  });

  const notificationsBacklog = pendingNotifications.map((row) => ({
    id: row.id,
    type: row.type,
    createdAt: row.createdAt.toISOString(),
    startedProcessingAt: row.startedProcessingAt ? row.startedProcessingAt.toISOString() : null,
    payloadPreview: `${JSON.stringify(row.payload).slice(0, 220)}${JSON.stringify(row.payload).length > 220 ? "…" : ""}`,
  }));

  const replayContext = webhookReplayIncidentContext();

  return (
    <div className="space-y-8">
      <OperationalBreadcrumbs segments={superAdminOperationsBreadcrumbs("Webhook replay")} className="-mb-2" />

      <OperationalEscalationBanner forceShow={Boolean(initialReceiptId)} title="Receipt-scoped replay">
        <p>You opened this console with a <span className="font-mono text-[12px]">receiptId</span> query — confirm vendor JSON separately before replaying side effects.</p>
      </OperationalEscalationBanner>

      <GovPageHeader
        eyebrow="Platform · Operations · Internal"
        title="Operational webhook replay"
        subtitle={`WebhookDeliveryReceipt persists hashes and linkage fields only — there is no stored raw PSP body. True re-execution requires vendor JSON pasted from Square/Shippo dashboards (or encrypted payload storage, which this task intentionally avoids). Financial guardrails: replay runs payment reconcile for Square and shipment hydrate for Shippo — Square operational refund-case webhook reconcile is suppressed; Square refund APIs are never invoked.`}
      />
      <OperationalCrossLinks context={replayContext} />
      <WebhookReplayConsole initialReceiptId={initialReceiptId} notificationsBacklog={notificationsBacklog} />    </div>
  );
}
