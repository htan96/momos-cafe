import type { UnifiedCartLine } from "@/types/commerce";

export interface CheckoutDisplayGroup {
  key: string;
  title: string;
  lines: UnifiedCartLine[];
}

/**
 * Single-column order summary — line order preserved from the bag (food tends to stay above shop).
 */
export function buildCheckoutDisplayGroups(lines: UnifiedCartLine[]): CheckoutDisplayGroup[] {
  if (lines.length === 0) return [];
  return [{ key: "order", title: "", lines }];
}
