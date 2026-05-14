import { NextResponse } from "next/server";
import type { UnifiedCartLine } from "@/types/commerce";

export type MaintenanceModeCode = "SHOP_DISABLED" | "MENU_DISABLED";

export function maintenanceModeJsonResponse(code: MaintenanceModeCode): NextResponse {
  return NextResponse.json({ error: "maintenance_mode", code }, { status: 403 });
}

function cartIncludesShopLines(lines: UnifiedCartLine[]): boolean {
  return lines.some((l) => l.kind === "merch");
}

function cartIncludesMenuLines(lines: UnifiedCartLine[]): boolean {
  return lines.some((l) => l.kind === "food");
}

/**
 * Returns a 403 response when unified cart lines conflict with maintenance flags.
 */
export function maintenanceBlockForUnifiedLines(
  lines: UnifiedCartLine[],
  flags: { shopEnabled: boolean; menuEnabled: boolean }
): NextResponse | null {
  if (cartIncludesShopLines(lines) && !flags.shopEnabled) {
    return maintenanceModeJsonResponse("SHOP_DISABLED");
  }
  if (cartIncludesMenuLines(lines) && !flags.menuEnabled) {
    return maintenanceModeJsonResponse("MENU_DISABLED");
  }
  return null;
}
