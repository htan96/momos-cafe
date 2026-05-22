import { prisma } from "@/lib/prisma";

export async function inferLocalIdsFromSquareRefundPeek(p: {
  paymentId: string;
}): Promise<{ commerceOrderId: string | null; paymentRecordId: string | null }> {
  const row = await prisma.paymentRecord.findFirst({
    where: { squarePaymentId: p.paymentId },
    select: { id: true, orderId: true },
  });
  return { commerceOrderId: row?.orderId ?? null, paymentRecordId: row?.id ?? null };
}
