import { getCartItemTotal } from "@/types/ordering";
import type { UnifiedCartLine } from "@/types/commerce";

export function lineMoneyUsd(line: UnifiedCartLine): number {
  if (line.kind === "food") {
    return getCartItemTotal({
      id: line.id,
      variationId: line.variationId,
      name: line.name,
      price: line.price,
      quantity: line.quantity,
      modifiers: line.modifiers,
    });
  }
  return line.unitPrice * line.quantity;
}

export function partitionSubtotalsUsd(lines: UnifiedCartLine[]): {
  kitchenUsd: number;
  retailUsd: number;
  totalUsd: number;
} {
  let kitchenUsd = 0;
  let retailUsd = 0;
  for (const l of lines) {
    const v = lineMoneyUsd(l);
    if (l.kind === "food") kitchenUsd += v;
    else retailUsd += v;
  }
  return { kitchenUsd, retailUsd, totalUsd: kitchenUsd + retailUsd };
}

export function usdToCents(amount: number): number {
  return Math.round(amount * 100);
}
