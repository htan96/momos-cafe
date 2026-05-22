import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  COMMERCE_ORDER_STATUSES,
  validateOrderStatusTransition,
  type CommerceOrderStatus,
} from "@/lib/commerce/orderLifecycle";
import {
  assertOperationalCommerceOrderMutation,
  loadOpsSessionForOrderMutation,
} from "@/lib/server/commerceOrderApiAuth";

/** PATCH coarse commerce order status — ops/internal only (never public storefront). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await loadOpsSessionForOrderMutation();
  const auth = assertOperationalCommerceOrderMutation(req, session, "orders:write");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  let body: { status?: string };
  try {
    body = (await req.json()) as { status?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const next = body.status?.trim() as CommerceOrderStatus | undefined;
  if (!next || !(COMMERCE_ORDER_STATUSES as readonly string[]).includes(next)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  try {
    const order = await prisma.commerceOrder.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const from = order.status as CommerceOrderStatus;
    const gate = validateOrderStatusTransition(from, next);
    if (!gate.ok) {
      return NextResponse.json({ error: "illegal_transition", reason: gate.reason }, { status: 422 });
    }

    const updated = await prisma.commerceOrder.update({
      where: { id },
      data: { status: next },
    });
    return NextResponse.json({ ok: true, order: updated });
  } catch (e) {
    console.error("[orders/[id]/status PATCH]", e);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
