import type { MerchFulfillmentSlug } from "@/types/merch";
import type { UnifiedCartLine, UnifiedFoodLine, UnifiedMerchLine } from "@/types/commerce";

export interface UnifiedCartParseIssue {
  code: string;
  /** Row index in submitted JSON array */
  index: number;
  message: string;
}

const MAX_QTY = 99;
const MIN_QTY = 1;

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function isUnifiedFoodLine(o: unknown): o is UnifiedFoodLine {
  if (!isRecord(o) || o.kind !== "food") return false;
  return (
    typeof o.lineId === "string" &&
    o.lineId.length > 0 &&
    typeof o.id === "string" &&
    o.id.length > 0 &&
    typeof o.name === "string" &&
    typeof o.price === "number" &&
    Number.isFinite(o.price) &&
    o.price >= 0 &&
    typeof o.quantity === "number" &&
    Number.isInteger(o.quantity) &&
    o.quantity >= MIN_QTY &&
    o.quantity <= MAX_QTY &&
    o.fulfillmentPipeline === "KITCHEN" &&
    o.pickupEligible === true &&
    o.shippingEligible === false
  );
}

export function isUnifiedMerchLine(o: unknown): o is UnifiedMerchLine {
  if (!isRecord(o) || o.kind !== "merch") return false;
  const slug = o.fulfillmentSlug;
  const slugOk = slug === "standard_pickup" || slug === "gift_card";
  return (
    typeof o.lineId === "string" &&
    o.lineId.length > 0 &&
    typeof o.productId === "string" &&
    o.productId.length > 0 &&
    typeof o.name === "string" &&
    typeof o.unitPrice === "number" &&
    Number.isFinite(o.unitPrice) &&
    o.unitPrice >= 0 &&
    typeof o.quantity === "number" &&
    Number.isInteger(o.quantity) &&
    o.quantity >= MIN_QTY &&
    o.quantity <= MAX_QTY &&
    typeof o.variantSummary === "string" &&
    slugOk &&
    o.fulfillmentPipeline === "RETAIL" &&
    typeof o.pickupEligible === "boolean" &&
    typeof o.shippingEligible === "boolean"
  );
}

/**
 * Strict parse for API bodies — invalid rows become `issues`; valid rows only.
 */
export function parseUnifiedCartLines(raw: unknown): {
  lines: UnifiedCartLine[];
  issues: UnifiedCartParseIssue[];
} {
  if (!Array.isArray(raw)) {
    return {
      lines: [],
      issues: [{ code: "LINES_NOT_ARRAY", index: -1, message: "Expected JSON array of cart lines" }],
    };
  }

  const lines: UnifiedCartLine[] = [];
  const issues: UnifiedCartParseIssue[] = [];

  raw.forEach((row, index) => {
    if (!isRecord(row)) {
      issues.push({
        code: "ROW_NOT_OBJECT",
        index,
        message: "Cart row must be an object",
      });
      return;
    }
    const kind = row.kind;
    if (kind !== "food" && kind !== "merch") {
      issues.push({
        code: "INVALID_KIND",
        index,
        message: 'kind must be "food" or "merch"',
      });
      return;
    }
    if (kind === "food") {
      if (isUnifiedFoodLine(row)) lines.push(row);
      else
        issues.push({
          code: "INVALID_FOOD_LINE",
          index,
          message:
            "Food line failed validation (ids, price/qty bounds, fulfillmentPipeline=KITCHEN, pickupEligible=true)",
        });
      return;
    }
    if (isUnifiedMerchLine(row)) lines.push(row);
    else
      issues.push({
        code: "INVALID_MERCH_LINE",
        index,
        message:
          "Merch line failed validation (productId, prices/qty, fulfillmentSlug, pipeline=RETAIL)",
      });
  });

  return { lines, issues };
}

/**
 * Best-effort hydration from localStorage — drops invalid rows silently.
 */
export function sanitizeUnifiedCartLinesFromStorage(raw: unknown): UnifiedCartLine[] {
  if (!Array.isArray(raw)) return [];
  const out: UnifiedCartLine[] = [];
  for (const row of raw) {
    if (isUnifiedFoodLine(row)) out.push(row);
    else if (isUnifiedMerchLine(row)) out.push(row);
  }
  return out;
}

/** Legacy slug coercion helper */
export function coerceMerchFulfillmentSlug(slug: unknown): MerchFulfillmentSlug | null {
  if (slug === "standard_pickup" || slug === "gift_card") return slug;
  return null;
}
