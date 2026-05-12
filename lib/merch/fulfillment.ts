import type { MerchFulfillmentMeta, MerchFulfillmentSlug } from "@/types/merch";

const STANDARD: MerchFulfillmentMeta = {
  slug: "standard_pickup",
  badgeLabel: "2–3 biz days",
  headline: "Made to order · Ready for pickup in 2–3 business days",
  detail:
    "Retail merch is prepared in small batches — not cooked to order like our menu. You'll get a pickup notification when your items are bagged. Need breakfast today? Use Order Pickup for food.",
  pickupEligible: true,
  shippingEligible: true,
};

const GIFT: MerchFulfillmentMeta = {
  slug: "gift_card",
  badgeLabel: "Digital-ready",
  headline: "Gift cards · Available same visit when fulfilled in-store",
  detail:
    "Physical gift cards follow our standard merch window; digital delivery options may vary — we'll confirm at checkout when live.",
  pickupEligible: true,
  shippingEligible: false,
};

export function fulfillmentForSlug(slug: MerchFulfillmentSlug): MerchFulfillmentMeta {
  return slug === "gift_card" ? GIFT : STANDARD;
}

export const DEFAULT_MERCH_FULFILLMENT = STANDARD;
