import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { FulfillmentPipeline } from "@/types/commerce";
import {
  validateFulfillmentTransition,
  validateOrderStatusTransition,
  type CommerceOrderStatus,
} from "@/lib/commerce/orderLifecycle";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import { opsCan } from "@/lib/ops/permissions";

async function maybeAdvanceAggregateOrderStatus(orderId: string): Promise<void> {
  const order = await prisma.commerceOrder.findUnique({
    where: { id: orderId },
    include: { fulfillmentGroups: true },
  });
  if (!order || order.status !== "paid") return;

  const groups = order.fulfillmentGroups;
  if (groups.length === 0) return;

  const terminalOk = (s: string) => s === "completed" || s === "cancelled";
  if (!groups.every((g) => terminalOk(g.status))) return;

  const allCompleted = groups.every((g) => g.status === "completed");
  const allCancelled = groups.every((g) => g.status === "cancelled");

  let next: CommerceOrderStatus;
  if (allCompleted) next = "fulfilled";
  else if (allCancelled) next = "cancelled";
  else next = "partially_fulfilled";

  const gate = validateOrderStatusTransition(order.status as CommerceOrderStatus, next);
  if (gate.ok) {
    await prisma.commerceOrder.update({
      where: { id: orderId },
      data: { status: next },
    });
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ groupId: string }> }
) {
  const session = await getOpsSession();
  if (!session || !opsCan(session.role, "fulfillment:write")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { groupId } = await ctx.params;
  let body: { orderId?: string; status?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const nextStatus = body.status?.trim();
  if (!orderId || !nextStatus) {
    return NextResponse.json({ error: "orderId_and_status_required" }, { status: 400 });
  }

  try {
    const group = await prisma.fulfillmentGroup.findFirst({
      where: { id: groupId, orderId },
      include: { order: true },
    });
    if (!group) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const pipeline = group.pipeline as FulfillmentPipeline;
    if (pipeline !== "KITCHEN" && pipeline !== "RETAIL") {
      return NextResponse.json({ error: "unknown_pipeline" }, { status: 400 });
    }

    const check = validateFulfillmentTransition(pipeline, group.status, nextStatus);
    if (!check.ok) {
      return NextResponse.json(
        { error: "illegal_transition", reason: check.reason },
        { status: 422 }
      );
    }

    const updated = await prisma.fulfillmentGroup.update({
      where: { id: groupId },
      data: { status: nextStatus },
    });

    await maybeAdvanceAggregateOrderStatus(orderId);

    return NextResponse.json({ ok: true, group: updated });
  } catch (e) {
    console.error("[ops fulfillment PATCH]", e);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
