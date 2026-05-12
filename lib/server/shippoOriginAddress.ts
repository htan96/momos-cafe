import type { AddressCreateRequest } from "shippo";
import { businessLocationToShippoAddress } from "@/lib/businessLocation";
import { loadAdminSettingsFromDb } from "@/lib/server/loadAdminSettings";

/** Ship-from address for Shippo — loaded from Ops `admin_settings.businessLocation` only */
export async function getShippoOriginAddressFromSettings(): Promise<AddressCreateRequest | null> {
  const settings = await loadAdminSettingsFromDb();
  const addr = businessLocationToShippoAddress(settings.businessLocation);
  if (!addr) {
    console.error(
      "[shipping] Incomplete admin_settings.businessLocation — cannot build Shippo address_from (need street1, city, state, postalCode)"
    );
  }
  return addr;
}
