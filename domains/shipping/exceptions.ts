/** Operational reasons — align webhook + manual resolution UIs later. */
export const SHIPPING_EXCEPTION_TYPES = [
  "ADDRESS_VALIDATION_FAILED",
  "RATE_UNAVAILABLE",
  "LABEL_PURCHASE_FAILED",
  "PICKUP_DELAY",
  "CARRIER_DELAY",
  "DAMAGE_REPORTED",
  "LOST_IN_TRANSIT",
  "CUSTOMS_HOLD",
  "CUSTOMER_UNAVAILABLE",
  "OTHER",
] as const;

export type ShippingExceptionType = (typeof SHIPPING_EXCEPTION_TYPES)[number];
