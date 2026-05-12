import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { FulfillmentPipeline } from "@/types/commerce";
import {
  validateFulfillmentTransition,
  type CommerceOrderStatus,
  validateOrderStatusTransition,
} from "@/lib/commerce/orderLifecycle";

/**
 * PATCH fulfillment group status — validates pipeline-specific transitions.
 * Internal orchestration hook (protect later with auth/service tokens).
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; groupId: string }> }
) {
  const { id: orderId, groupId } = await ctx.params;
  let body: { status?: string };
  try {
    body = (await req.json()) as { status?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const nextStatus = body.status?.trim();
  if (!nextStatus) {
    return NextResponse.json({ error: "status required" }, { status: 400 });
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

    /** Opportunistically advance coarse order status when groups complete */
    await maybeAdvanceAggregateOrderStatus(orderId);

    return NextResponse.json({ ok: true, group: updated });
  } catch (e) {
    console.error("[fulfillment PATCH]", e);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}

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
