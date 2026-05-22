import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertReadableCommerceOrder } from "@/lib/server/commerceOrderApiAuth";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "order id required" }, { status: 400 });
  }
  try {
    const lite = await prisma.commerceOrder.findUnique({
      where: { id },
      select: {
        id: true,
        customerId: true,
        guestCartToken: true,
      },
    });
    if (!lite) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const gate = await assertReadableCommerceOrder(req, lite);
    if (!gate.ok) return gate.response;

    const order = await prisma.commerceOrder.findUnique({
      where: { id },
      include: {
        items: true,
        fulfillmentGroups: {
          include: {
            items: {
              include: {
                orderItem: true,
              },
            },
          },
        },
        payments: true,
      },
    });
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({ order });
  } catch (e) {
    console.error("[orders/[id] GET]", e);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
