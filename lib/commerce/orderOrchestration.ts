import type { UnifiedCartLine } from "@/types/commerce";
import { partitionByFulfillmentPipeline } from "@/lib/commerce/fulfillmentPreview";

/** Prepares grouped lines for order writes — mirrors checkout partition UX. */
export function partitionLinesForOrderWrite(lines: UnifiedCartLine[]): {
  pipeline: "KITCHEN" | "RETAIL";
  lines: UnifiedCartLine[];
}[] {
  const { kitchen, retail } = partitionByFulfillmentPipeline(lines);
  const out: { pipeline: "KITCHEN" | "RETAIL"; lines: UnifiedCartLine[] }[] = [];
  if (kitchen.length) out.push({ pipeline: "KITCHEN", lines: kitchen });
  if (retail.length) out.push({ pipeline: "RETAIL", lines: retail });
  return out;
}
