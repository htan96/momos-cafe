import { OPS_ENTITY_UUID_RE } from "@/lib/operations/operationalContextLinks";
import { prisma } from "@/lib/prisma";

/** Parse payment-ish Square webhook payloads (trusted only after signature verification). */
export function extractSquarePaymentWebhookEnvelope(body: Record<string, unknown>): {
  squarePaymentId: string;
  referenceId?: string;
  status: string;
} | null {
  const data = body.data as Record<string, unknown> | undefined;
  const obj = data?.object as Record<string, unknown> | undefined;
  const payment = (obj?.payment ?? obj) as Record<string, unknown> | undefined;
  const id = typeof payment?.id === "string" ? payment.id : undefined;
  const status = typeof payment?.status === "string" ? payment.status : undefined;
  const referenceId =
    typeof payment?.reference_id === "string"
      ? payment.reference_id
      : typeof payment?.referenceId === "string"
        ? payment.referenceId
        : undefined;

  const rootType = typeof body.type === "string" ? body.type : "";
  if (rootType && !/^payment\./i.test(rootType)) {
    return null;
  }
  if (!id || !status) return null;
  return { squarePaymentId: id, referenceId, status };
}

/**
 * Resolve local ids from a signed Square payment webhook peek when possible (never throws).
 */
export async function inferLocalIdsFromPeekedWebhook(p: {
  squarePaymentId?: string;
  referenceId?: string;
}): Promise<{ commerceOrderId: string | null; paymentRecordId: string | null }> {
  let paymentRecordId: string | null = null;
  let commerceOrderId: string | null = null;

  try {
    if (p.squarePaymentId) {
      const row = await prisma.paymentRecord.findFirst({
        where: { squarePaymentId: p.squarePaymentId },
        select: { id: true, orderId: true },
      });
      if (row) {
        paymentRecordId = row.id;
        commerceOrderId = row.orderId ?? null;
      }
    }

    if (!paymentRecordId && p.referenceId?.trim()) {
      const ref = p.referenceId.trim();
      if (OPS_ENTITY_UUID_RE.test(ref)) {
        const hit = await prisma.paymentRecord.findFirst({
          where: { OR: [{ id: ref }, { idempotencyKey: ref }] },
          select: { id: true, orderId: true },
        });
        if (hit) {
          paymentRecordId = hit.id;
          commerceOrderId = hit.orderId ?? null;
        } else {
          const orderOnly = await prisma.commerceOrder.findUnique({
            where: { id: ref },
            select: { id: true },
          });
          if (orderOnly) commerceOrderId = orderOnly.id;
        }
      }
    }
  } catch {
    /* best-effort */
  }

  return { commerceOrderId, paymentRecordId };
}
