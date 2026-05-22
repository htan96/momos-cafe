import { NextResponse } from "next/server";
import { requireSuperStaffJson } from "@/lib/auth/cognito/requireSuperStaff";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/server/apiErrors";

export const runtime = "nodejs";

const CUIDISH = /^[a-z][a-z0-9_-]{15,}$/i;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperStaffJson();
  if (gate) return gate;

  const { id } = await ctx.params;
  if (!CUIDISH.test(id)) return jsonError(400, "BAD_ID", "Receipt id missing or malformed.");

  const receipt = await prisma.webhookDeliveryReceipt.findUnique({
    where: { id },
  });
  if (!receipt) return jsonError(404, "NOT_FOUND", "Webhook delivery receipt not found.");

  const paymentPromise =
    receipt.paymentRecordId ?
      prisma.paymentRecord.findUnique({
        where: { id: receipt.paymentRecordId },
        select: {
          id: true,
          status: true,
          amountCents: true,
          provider: true,
          squarePaymentId: true,
          squarePaymentStatus: true,
          orderId: true,
          idempotencyKey: true,
          updatedAt: true,
        },
      })
    : Promise.resolve(null);

  const orderPromise =
    receipt.commerceOrderId ?
      prisma.commerceOrder.findUnique({
        where: { id: receipt.commerceOrderId },
        select: {
          id: true,
          status: true,
          totalCents: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : Promise.resolve(null);

  const shipmentsPromise =
    receipt.commerceOrderId ?
      prisma.shipment.findMany({
        where: { fulfillmentGroup: { orderId: receipt.commerceOrderId } },
        take: 12,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          status: true,
          carrier: true,
          trackingNumber: true,
          shippedAt: true,
          fulfillmentGroupId: true,
          updatedAt: true,
        },
      })
    : Promise.resolve([]);

  const [payment, order, shipments] = await Promise.all([paymentPromise, orderPromise, shipmentsPromise]);

  return NextResponse.json({
    receipt,
    related: {
      paymentRecord: payment,
      commerceOrder: order,
      shipments,
    },
  });
}
