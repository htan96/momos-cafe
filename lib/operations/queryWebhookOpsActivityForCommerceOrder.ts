import type { OperationalActivityEvent } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";

/** Webhook + signature failures relevant to PSP ↔ local payment reconciliation */
export const WEBHOOK_OPS_EVENT_TYPES: string[] = [
  PLATFORM_EVENT_SUBTYPE.PAYMENT_WEBHOOK_PROCESSING_FAILED,
  PLATFORM_EVENT_SUBTYPE.PAYMENT_SQUARE_ORPHAN_WEBHOOK,
  PLATFORM_EVENT_SUBTYPE.SECURITY_WEBHOOK_SIGNATURE_INVALID,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_WEBHOOK_PROCESSING_FAILED,
  PLATFORM_EVENT_SUBTYPE.SHIPMENT_WEBHOOK_ORPHAN,
];

export async function queryWebhookOpsActivityForCommerceOrder(
  orderId: string,
  opts?: { take?: number }
): Promise<OperationalActivityEvent[]> {
  const take = Math.min(50, Math.max(1, opts?.take ?? 15));
  const linkOr = [
    { message: { contains: orderId } },
    { metadata: { path: ["orderId"], equals: orderId } },
    { metadata: { path: ["commerceOrderId"], equals: orderId } },
    { metadata: { path: ["entities", "orderId"], equals: orderId } },
    { metadata: { path: ["entities", "commerceOrderId"], equals: orderId } },
  ];

  const rows = await prisma.operationalActivityEvent.findMany({
    where: {
      AND: [{ type: { in: WEBHOOK_OPS_EVENT_TYPES } }, { OR: linkOr }],
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  const seen = new Set<string>();
  const deduped: OperationalActivityEvent[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    deduped.push(r);
  }
  return deduped.reverse();
}
