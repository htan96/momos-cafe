import type { WebhookProcessingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type UpsertWebhookReceiptInput = {
  provider: string;
  externalEventId?: string | null;
  eventType?: string | null;
  payloadHash?: string | null;
  signatureValid: boolean;
  processingStatus: WebhookProcessingStatus;
  httpStatus?: number | null;
  errorCode?: string | null;
  commerceOrderId?: string | null;
  paymentRecordId?: string | null;
  opsEventId?: string | null;
};

/** App-level upsert keyed by `(provider, externalEventId)` when `externalEventId` is present; plain create otherwise. */
export async function upsertWebhookDeliveryReceipt(input: UpsertWebhookReceiptInput): Promise<{ id: string }> {
  const ext = input.externalEventId?.trim();
  const existing =
    ext &&
    (await prisma.webhookDeliveryReceipt.findFirst({
      where: { provider: input.provider, externalEventId: ext },
      select: { id: true },
    }));

  if (existing) {
    const data: Prisma.WebhookDeliveryReceiptUpdateInput = {
      eventType: input.eventType?.trim() || null,
      payloadHash: input.payloadHash ?? null,
      signatureValid: input.signatureValid,
      processingStatus: input.processingStatus,
      httpStatus: input.httpStatus ?? null,
      errorCode: input.errorCode ?? null,
      commerceOrderId: input.commerceOrderId ?? null,
      paymentRecordId: input.paymentRecordId ?? null,
      opsEventId: input.opsEventId ?? null,
    };
    return prisma.webhookDeliveryReceipt.update({
      where: { id: existing.id },
      data,
      select: { id: true },
    });
  }

  return prisma.webhookDeliveryReceipt.create({
    data: {
      provider: input.provider,
      externalEventId: ext || null,
      eventType: input.eventType?.trim() || null,
      payloadHash: input.payloadHash ?? null,
      signatureValid: input.signatureValid,
      processingStatus: input.processingStatus,
      httpStatus: input.httpStatus ?? null,
      errorCode: input.errorCode ?? null,
      commerceOrderId: input.commerceOrderId ?? null,
      paymentRecordId: input.paymentRecordId ?? null,
      opsEventId: input.opsEventId ?? null,
    },
    select: { id: true },
  });
}

export async function patchWebhookDeliveryReceipt(
  id: string,
  patch: {
    processingStatus?: WebhookProcessingStatus;
    httpStatus?: number | null;
    errorCode?: string | null;
    commerceOrderId?: string | null;
    paymentRecordId?: string | null;
    opsEventId?: string | null;
    payloadHash?: string | null;
    eventType?: string | null;
    signatureValid?: boolean;
  }
): Promise<void> {
  const data: Prisma.WebhookDeliveryReceiptUpdateInput = {};
  if (patch.eventType !== undefined) data.eventType = patch.eventType?.trim() || null;
  if (patch.payloadHash !== undefined) data.payloadHash = patch.payloadHash ?? null;
  if (patch.signatureValid !== undefined) data.signatureValid = patch.signatureValid;
  if (patch.processingStatus !== undefined) data.processingStatus = patch.processingStatus;
  if (patch.httpStatus !== undefined) data.httpStatus = patch.httpStatus ?? null;
  if (patch.errorCode !== undefined) data.errorCode = patch.errorCode ?? null;
  if (patch.commerceOrderId !== undefined) data.commerceOrderId = patch.commerceOrderId ?? null;
  if (patch.paymentRecordId !== undefined) data.paymentRecordId = patch.paymentRecordId ?? null;
  if (patch.opsEventId !== undefined) data.opsEventId = patch.opsEventId ?? null;

  if (Object.keys(data).length === 0) return;

  await prisma.webhookDeliveryReceipt.update({
    where: { id },
    data,
  });
}
