import type { Prisma } from "@prisma/client";

/** Match OperationalActivity rows tied to one commerce order (paths emitters commonly use). */
export function buildCommerceOrderOperationalActivityWhere(input: {
  orderId: string;
  shipmentIds: string[];
  paymentIds: string[];
}): Prisma.OperationalActivityEventWhereInput {
  const linkOr: Prisma.OperationalActivityEventWhereInput[] = [
    { message: { contains: input.orderId } },
    { metadata: { path: ["orderId"], equals: input.orderId } },
    { metadata: { path: ["commerceOrderId"], equals: input.orderId } },
    { metadata: { path: ["entities", "orderId"], equals: input.orderId } },
    { metadata: { path: ["entities", "commerceOrderId"], equals: input.orderId } },
    ...input.shipmentIds.map((id) => ({ metadata: { path: ["shipmentId"], equals: id } })),
    ...input.shipmentIds.map((id) => ({ metadata: { path: ["entities", "shipmentId"], equals: id } })),
    ...input.paymentIds.map((id) => ({ metadata: { path: ["paymentRecordId"], equals: id } })),
  ];
  return { OR: linkOr };
}
