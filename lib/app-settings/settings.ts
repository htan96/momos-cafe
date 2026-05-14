import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { APP_SETTING_MENU_ENABLED, APP_SETTING_SHOP_ENABLED } from "@/lib/app-settings/constants";

/**
 * Ensures default rows exist so deploys work without manual SQL.
 * Defaults: both surfaces **open** (`enabled: true`).
 */
export async function ensureDefaultAppSettings(): Promise<void> {
  await prisma.appSetting.upsert({
    where: { settingId: APP_SETTING_SHOP_ENABLED },
    create: {
      settingId: APP_SETTING_SHOP_ENABLED,
      enabled: true,
      description: "Retail shop catalog and shop-side checkout.",
    },
    update: {},
  });
  await prisma.appSetting.upsert({
    where: { settingId: APP_SETTING_MENU_ENABLED },
    create: {
      settingId: APP_SETTING_MENU_ENABLED,
      enabled: true,
      description: "Café menu browsing and food ordering (/menu, /order).",
    },
    update: {},
  });
}

export async function getAppSetting(settingId: string) {
  if (settingId === APP_SETTING_SHOP_ENABLED || settingId === APP_SETTING_MENU_ENABLED) {
    await ensureDefaultAppSettings();
  }
  return prisma.appSetting.findUnique({ where: { settingId } });
}

async function loadMaintenanceFlagsFromDb(): Promise<{ shopEnabled: boolean; menuEnabled: boolean }> {
  await ensureDefaultAppSettings();
  const rows = await prisma.appSetting.findMany({
    where: { settingId: { in: [APP_SETTING_SHOP_ENABLED, APP_SETTING_MENU_ENABLED] } },
    select: { settingId: true, enabled: true },
  });
  const byId = new Map(rows.map((r) => [r.settingId, r.enabled] as const));
  return {
    shopEnabled: byId.get(APP_SETTING_SHOP_ENABLED) !== false,
    menuEnabled: byId.get(APP_SETTING_MENU_ENABLED) !== false,
  };
}

const MAINTENANCE_CACHE_TAG = "app-maintenance-settings";

/**
 * Cached read for Server Components / layouts (~45s). Invalidate via `revalidateTag(MAINTENANCE_CACHE_TAG)` after admin writes.
 */
export const getMaintenanceFlags = unstable_cache(loadMaintenanceFlagsFromDb, ["maintenance-flags-v1"], {
  revalidate: 45,
  tags: [MAINTENANCE_CACHE_TAG],
});

export { MAINTENANCE_CACHE_TAG };
