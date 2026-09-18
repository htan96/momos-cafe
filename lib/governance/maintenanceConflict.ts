import type { GovernanceControlKey } from "@/lib/governance/controlKeys";

export type MaintenanceGateSnapshot = {
  shopEnabled: boolean;
  menuEnabled: boolean;
  shopUpdatedBy: string | null;
  menuUpdatedBy: string | null;
  shopUpdatedAt: string | null;
  menuUpdatedAt: string | null;
};

export type GovernanceMaintenanceFlags = {
  maintenance_mode: boolean;
  menu_hidden: boolean;
};

export type MaintenanceConflict = {
  id: string;
  severity: "warning";
  message: string;
  detail: string;
};

/**
 * Detects drift between governance maintenance flags and AppSetting ShopEnabled / MenuEnabled.
 */
export function detectMaintenanceConflicts(args: {
  governance: GovernanceMaintenanceFlags;
  appSettings: MaintenanceGateSnapshot;
}): MaintenanceConflict[] {
  const conflicts: MaintenanceConflict[] = [];
  const { governance, appSettings } = args;

  const expectedShop = !governance.maintenance_mode;
  const expectedMenu = governance.maintenance_mode ? false : !governance.menu_hidden;

  if (appSettings.shopEnabled !== expectedShop) {
    conflicts.push({
      id: "shop-governance-drift",
      severity: "warning",
      message: "Retail shop gate disagrees with governance maintenance_mode",
      detail: governance.maintenance_mode
        ? "maintenance_mode is on but ShopEnabled is still open — storefront retail may remain reachable."
        : "maintenance_mode is off but ShopEnabled is closed — admin maintenance may have diverged from governance.",
    });
  }

  if (appSettings.menuEnabled !== expectedMenu) {
    conflicts.push({
      id: "menu-governance-drift",
      severity: "warning",
      message: "Café menu gate disagrees with governance maintenance / menu_hidden",
      detail: governance.maintenance_mode
        ? "maintenance_mode is on but MenuEnabled is still open."
        : governance.menu_hidden
          ? "menu_hidden is on but MenuEnabled is still open."
          : "menu_hidden is off but MenuEnabled is closed — check admin maintenance toggles.",
    });
  }

  if (!governance.maintenance_mode && governance.menu_hidden && appSettings.shopEnabled && !appSettings.menuEnabled) {
    conflicts.push({
      id: "menu-hidden-partial-close",
      severity: "warning",
      message: "Menu hidden via governance while shop remains open",
      detail: "Expected when only café ordering should stop — confirm this is intentional.",
    });
  }

  return conflicts;
}

export function governanceKeysAffectingMaintenance(): GovernanceControlKey[] {
  return ["maintenance_mode", "menu_hidden"];
}
