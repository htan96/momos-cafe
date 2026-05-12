import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "order id required" }, { status: 400 });
  }
  try {
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
