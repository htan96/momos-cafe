import type { Prisma } from "@prisma/client";
import type { UnifiedCartLine } from "@/types/commerce";
import { commerceKind } from "@/lib/commerce/cartLineDb";
import { lineMoneyUsd } from "@/lib/commerce/orderMoney";

export function unifiedLineToCommerceOrderItem(
  line: UnifiedCartLine
): Prisma.CommerceOrderItemCreateWithoutOrderInput {
  const totalUsd = lineMoneyUsd(line);
  const unitUsd = totalUsd / Math.max(1, line.quantity);
  const pipeline = line.kind === "food" ? "KITCHEN" : "RETAIL";
  const squareCatalogItemId =
    line.kind === "food" ? line.id : line.productId;
  const squareVariationId =
    line.kind === "food" ? line.variationId ?? undefined : line.squareVariationId ?? undefined;

  return {
    kind: commerceKind(line),
    title: line.name,
    quantity: line.quantity,
    unitPriceCents: Math.round(unitUsd * 100),
    payload: JSON.parse(JSON.stringify(line)) as Prisma.InputJsonObject,
    squareCatalogItemId,
    squareVariationId,
    fulfillmentPipeline: pipeline,
  };
}
