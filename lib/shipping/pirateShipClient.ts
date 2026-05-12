/**
 * Pirate Ship (https://www.pirateship.com) — rate shopping & label purchase.
 *
 * ENV: `PIRATE_SHIP_API_KEY` — optional; when unset all quote helpers are no-ops / empty.
 *
 * NEXT STEPS (live integration):
 * 1. Confirm API surface (OAuth vs API key — Pirate Ship exposes partner integrations; align with vendor docs).
 * 2. Map `UnifiedMerchLine` + packed dimensions → carrier request payload.
 * 3. Persist selected rate ID on `FulfillmentGroup` / `Shipment` rows; charge customer via Square when label purchased.
 */

export interface PirateShipQuoteRequest {
  shipFromZip?: string;
  shipToPostalCode: string;
  shipToCountry?: string;
  weightOz: number;
}

export interface PirateShipQuote {
  id: string;
  carrier: string;
  service: string;
  amountCents: number;
}

function enabled(): boolean {
  return typeof process.env.PIRATE_SHIP_API_KEY === "string" && process.env.PIRATE_SHIP_API_KEY.length > 0;
}

/** Placeholder — returns empty until Pirate Ship endpoints are wired. */
export async function getShippingQuotes(_req: PirateShipQuoteRequest): Promise<PirateShipQuote[]> {
  if (!enabled()) return [];
  await Promise.resolve(undefined);
  return [];
}
