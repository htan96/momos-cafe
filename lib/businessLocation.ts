import type { AddressCreateRequest } from "shippo";
import type { BusinessLocation } from "@/lib/adminSettings.model";

/** Single-line street + city + state + ZIP (maps query / SEO-style). */
export function formatBusinessAddressOneLine(loc: BusinessLocation): string {
  const street1 = loc.street1?.trim() ?? "";
  const city = loc.city?.trim() ?? "";
  const state = loc.state?.trim() ?? "";
  const zip = loc.postalCode?.trim() ?? "";
  const tail = `${city}, ${state} ${zip}`.replace(/\s+/g, " ").trim();
  return `${street1}, ${tail}`.replace(/\s+/g, " ").trim();
}

/** Compact line without postal code (footer-style). */
export function formatBusinessAddressShort(loc: BusinessLocation): string {
  const street1 = loc.street1?.trim() ?? "";
  const city = loc.city?.trim() ?? "";
  const state = loc.state?.trim() ?? "";
  return `${street1}, ${city}, ${state}`.replace(/\s+/g, " ").trim();
}

export function businessPhoneDisplay(loc: BusinessLocation): string {
  return (loc.phoneDisplay?.trim() || loc.phoneE164?.trim() || "").trim();
}

export function businessPhoneTelHref(loc: BusinessLocation): string {
  const e164 = loc.phoneE164?.trim();
  if (e164) return `tel:${e164.replace(/\s/g, "")}`;
  const digits = (loc.phoneDisplay ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  if (digits.length === 10) return `tel:+1${digits}`;
  return digits.length > 0 ? `tel:+${digits}` : "tel:";
}

/**
 * Shippo `address_from` — fails closed when required operational fields are missing.
 */
export function businessLocationToShippoAddress(
  loc: BusinessLocation | undefined
): AddressCreateRequest | null {
  if (!loc) return null;
  const street1 = loc.street1?.trim();
  const city = loc.city?.trim();
  const state = loc.state?.trim();
  const zip = loc.postalCode?.trim().replace(/\s+/g, "");
  const country = (loc.country?.trim() || "US").slice(0, 2).toUpperCase() || "US";
  const name = loc.displayName?.trim();

  if (!street1 || !city || !state || !zip || zip.replace(/\D/g, "").length < 5) return null;

  const phone = loc.phoneE164?.trim();
  return {
    ...(name ? { name } : {}),
    ...(phone ? { phone } : {}),
    street1,
    ...(loc.street2?.trim() ? { street2: loc.street2.trim() } : {}),
    city,
    state,
    zip,
    country,
  };
}
