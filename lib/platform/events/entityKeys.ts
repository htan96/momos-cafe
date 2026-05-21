/** Standard `entities` keys on envelope v1 (camelCase). */
export const PLATFORM_ENTITY_KEYS = [
  "customerId",
  "adminId",
  "commerceOrderId",
  "cafeOrderId",
  "paymentRecordId",
  "shipmentId",
  "incidentId",
  "impersonationSessionId",
] as const;

export type PlatformEntityKey = (typeof PLATFORM_ENTITY_KEYS)[number];

export type PlatformEntityLinks = Partial<Record<PlatformEntityKey, string>>;
