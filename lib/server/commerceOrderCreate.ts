import type { Prisma } from "@prisma/client";
import type { UnifiedCartLine } from "@/types/commerce";
import { prisma } from "@/lib/prisma";
import { unifiedLineToCommerceOrderItem } from "@/lib/commerce/commerceOrderDraft";
import { partitionLinesForOrderWrite } from "@/lib/commerce/orderOrchestration";
import { partitionSubtotalsUsd, usdToCents } from "@/lib/commerce/orderMoney";
import { initialFulfillmentStatus } from "@/lib/commerce/orderLifecycle";

export interface CreatedCommerceOrderResult {
  orderId: string;
  fulfillmentGroupsCreated: number;
}

export async function createCommerceOrderWithGroups(input: {
  lines: UnifiedCartLine[];
  guestCartToken?: string | null;
  /** Linked when the storefront customer session is present at draft creation */
  customerId?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<CreatedCommerceOrderResult> {
  const { lines, guestCartToken = null, customerId = null, metadata } = input;
  const { kitchenUsd, retailUsd, totalUsd } = partitionSubtotalsUsd(lines);

  return prisma.$transaction(async (tx) => {
    const order = await tx.commerceOrder.create({
      data: {
        status: "draft",
        guestCartToken,
        ...(customerId ? { customerId } : {}),
        totalCents: usdToCents(totalUsd),
        kitchenSubtotalCents: usdToCents(kitchenUsd),
        retailSubtotalCents: usdToCents(retailUsd),
        metadata: metadata ?? undefined,
        items: {
          create: lines.map(unifiedLineToCommerceOrderItem),
        },
      },
      include: { items: true },
    });

    const lineIdToOrderItemId = new Map<string, string>();
    for (const item of order.items) {
      const payload = item.payload as { lineId?: string } | null;
      if (!payload?.lineId) {
        throw new Error(`MISSING_LINE_ID_IN_PAYLOAD:${item.id}`);
      }
      lineIdToOrderItemId.set(payload.lineId, item.id);
    }

    const partitions = partitionLinesForOrderWrite(lines);
    let n = 0;
    for (const part of partitions) {
      const itemCreates = part.lines.map((line) => {
        const oid = lineIdToOrderItemId.get(line.lineId);
        if (!oid) throw new Error(`missing_order_item_for_line:${line.lineId}`);
        return { orderItemId: oid };
      });

      await tx.fulfillmentGroup.create({
        data: {
          orderId: order.id,
          pipeline: part.pipeline,
          status: initialFulfillmentStatus(),
          items: { create: itemCreates },
        },
      });
      n += 1;
    }

    return { orderId: order.id, fulfillmentGroupsCreated: n };
  });
}
