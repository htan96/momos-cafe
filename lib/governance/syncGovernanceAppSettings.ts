import {
  APP_SETTING_MENU_ENABLED,
  APP_SETTING_SHOP_ENABLED,
} from "@/lib/app-settings/constants";
import type { Prisma } from "@prisma/client";

/**
 * Applies `maintenance_mode` + `menu_hidden` governance flags to `AppSetting` rows.
 * When maintenance is on, both gates close. When off, shop reopens and menu follows `menuHidden`.
 */
export async function syncAppSettingsFromGovernanceState(
  tx: Prisma.TransactionClient,
  args: { maintenanceMode: boolean; menuHidden: boolean; actorLabel: string }
): Promise<void> {
  if (args.maintenanceMode) {
    await tx.appSetting.update({
      where: { settingId: APP_SETTING_SHOP_ENABLED },
      data: { enabled: false, updatedBy: args.actorLabel },
    });
    await tx.appSetting.update({
      where: { settingId: APP_SETTING_MENU_ENABLED },
      data: { enabled: false, updatedBy: args.actorLabel },
    });
  } else {
    await tx.appSetting.update({
      where: { settingId: APP_SETTING_SHOP_ENABLED },
      data: { enabled: true, updatedBy: args.actorLabel },
    });
    await tx.appSetting.update({
      where: { settingId: APP_SETTING_MENU_ENABLED },
      data: { enabled: !args.menuHidden, updatedBy: args.actorLabel },
    });
  }
}
