import { WebhookProcessingStatus } from "@prisma/client";
import { OPERATIONAL_SHIPPO_WEBHOOK_OPS_VISIBILITY_MS } from "@/lib/operations/semantics/constants";
import { prisma } from "@/lib/prisma";

const PROVIDER = "shippo";

/** Receipt window sourced from semantics (`OPERATIONAL_SHIPPO_WEBHOOK_OPS_VISIBILITY_MS`); replay older rows from backups / Shippo logs. */
export type ShippoWebhookReceiptRow = {
  id: string;
  receivedAt: Date;
  externalEventId: string | null;
  eventType: string | null;
  processingStatus: WebhookProcessingStatus;
  signatureValid: boolean;
  httpStatus: number | null;
  errorCode: string | null;
  commerceOrderId: string | null;
  payloadHash: string | null;
};

export type ShippoWebhookOperationalVisibility = {
  since: Date;
  counts: {
    total: number;
    processed: number;
    failed: number;
    orphaned: number;
    signatureInvalid: number;
    ignored: number;
  };
  orphanRecent: ShippoWebhookReceiptRow[];
  failedRecent: ShippoWebhookReceiptRow[];
};

export async function loadShippoWebhookOperationalVisibility(): Promise<ShippoWebhookOperationalVisibility> {
  const since = new Date(Date.now() - OPERATIONAL_SHIPPO_WEBHOOK_OPS_VISIBILITY_MS);

  const baseWhere = { provider: PROVIDER, receivedAt: { gte: since } } as const;

  const [total, processed, failed, orphaned, signatureInvalid, ignored, orphanRecent, failedRecent] =
    await prisma.$transaction([
      prisma.webhookDeliveryReceipt.count({ where: baseWhere }),
      prisma.webhookDeliveryReceipt.count({
        where: { ...baseWhere, processingStatus: WebhookProcessingStatus.processed },
      }),
      prisma.webhookDeliveryReceipt.count({
        where: { ...baseWhere, processingStatus: WebhookProcessingStatus.failed },
      }),
      prisma.webhookDeliveryReceipt.count({
        where: { ...baseWhere, errorCode: "ORPHAN_NO_LOCAL_SHIPMENT" },
      }),
      prisma.webhookDeliveryReceipt.count({
        where: { ...baseWhere, signatureValid: false },
      }),
      prisma.webhookDeliveryReceipt.count({
        where: { ...baseWhere, processingStatus: WebhookProcessingStatus.ignored },
      }),
      prisma.webhookDeliveryReceipt.findMany({
        where: { ...baseWhere, errorCode: "ORPHAN_NO_LOCAL_SHIPMENT" },
        orderBy: { receivedAt: "desc" },
        take: 60,
        select: {
          id: true,
          receivedAt: true,
          externalEventId: true,
          eventType: true,
          processingStatus: true,
          signatureValid: true,
          httpStatus: true,
          errorCode: true,
          commerceOrderId: true,
          payloadHash: true,
        },
      }),
      prisma.webhookDeliveryReceipt.findMany({
        where: {
          ...baseWhere,
          processingStatus: WebhookProcessingStatus.failed,
          NOT: { errorCode: "ORPHAN_NO_LOCAL_SHIPMENT" },
        },
        orderBy: { receivedAt: "desc" },
        take: 40,
        select: {
          id: true,
          receivedAt: true,
          externalEventId: true,
          eventType: true,
          processingStatus: true,
          signatureValid: true,
          httpStatus: true,
          errorCode: true,
          commerceOrderId: true,
          payloadHash: true,
        },
      }),
    ]);

  return {
    since,
    counts: {
      total,
      processed,
      failed,
      orphaned,
      signatureInvalid,
      ignored,
    },
    orphanRecent,
    failedRecent,
  };
}
