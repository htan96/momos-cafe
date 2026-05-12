import type { UnifiedMerchLine } from "@/types/commerce";
import { DistanceUnitEnum, WeightUnitEnum, type ParcelCreateRequest } from "shippo";

/**
 * Lightweight parcel sizing for carrier quotes — **not** production-accurate weights.
 *
 * TODO: Replace with real per-SKU weights/dims from catalog or packing rules once inventory data exists.
 */
const DEFAULT_DIM_IN = { length: "11", width: "8.5", height: "5" };

/** Estimated ounces per unit by fulfillment slug — placeholders only. */
const UNIT_WEIGHT_OZ_BY_SLUG: Record<string, number> = {
  standard_pickup: 10,
  gift_card: 0,
};

const MIN_WEIGHT_OZ = 4;
const MAX_WEIGHT_OZ = 160;

function slugWeightOz(line: UnifiedMerchLine): number {
  const base = UNIT_WEIGHT_OZ_BY_SLUG[line.fulfillmentSlug];
  if (typeof base === "number" && Number.isFinite(base)) {
    return Math.max(0, base) * line.quantity;
  }
  return 10 * line.quantity;
}

/**
 * Build one domestic parcel from eligible merch lines (caller filters food/gifts/non-shipping SKUs).
 */
export function buildParcelEstimate(lines: UnifiedMerchLine[]): ParcelCreateRequest {
  let totalOz = 0;
  for (const line of lines) {
    totalOz += slugWeightOz(line);
  }
  const clamped = Math.min(MAX_WEIGHT_OZ, Math.max(MIN_WEIGHT_OZ, Math.round(totalOz)));

  let { length, width, height } = DEFAULT_DIM_IN;
  const qty = lines.reduce((s, l) => s + l.quantity, 0);
  if (qty > 3) {
    length = "13";
    width = "10";
    height = "7";
  }

  return {
    distanceUnit: DistanceUnitEnum.In,
    massUnit: WeightUnitEnum.Oz,
    length,
    width,
    height,
    weight: String(clamped),
  };
}
