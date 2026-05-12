import type { Prisma } from "@prisma/client";
import type { UnifiedCartLine } from "@/types/commerce";

export function commerceKind(line: UnifiedCartLine): string {
  if (line.kind === "food") return "FOOD";
  if (line.kind === "merch" && line.fulfillmentSlug === "gift_card") return "GIFT_CARD";
  return "MERCH";
}

export function unifiedLineToCartItemCreate(
  line: UnifiedCartLine
): Prisma.CartItemCreateWithoutSessionInput {
  const pipeline = line.kind === "food" ? "KITCHEN" : "RETAIL";
  const squareCatalogItemId =
    line.kind === "food" ? line.id : line.productId;
  const squareVariationId =
    line.kind === "food" ? line.variationId ?? undefined : line.squareVariationId ?? undefined;

  return {
    lineId: line.lineId,
    kind: commerceKind(line),
    quantity: line.quantity,
    payload: JSON.parse(JSON.stringify(line)) as Prisma.InputJsonObject,
    squareCatalogItemId,
    squareVariationId,
    fulfillmentPipeline: pipeline,
  };
}
