import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isAdmin } from "@/lib/auth/cognito/roles";
import {
  APP_SETTING_MENU_ENABLED,
  APP_SETTING_SHOP_ENABLED,
} from "@/lib/app-settings/constants";
import { ensureDefaultAppSettings, MAINTENANCE_CACHE_TAG } from "@/lib/app-settings/settings";

export async function GET() {
  const user = await getCognitoServerSession();
  if (!user || !isAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  await ensureDefaultAppSettings();
  const rows = await prisma.appSetting.findMany({
    where: { settingId: { in: [APP_SETTING_SHOP_ENABLED, APP_SETTING_MENU_ENABLED] } },
    select: { settingId: true, enabled: true, lastUpdated: true, updatedBy: true },
  });
  const shop = rows.find((r) => r.settingId === APP_SETTING_SHOP_ENABLED);
  const menu = rows.find((r) => r.settingId === APP_SETTING_MENU_ENABLED);

  return NextResponse.json({
    shopEnabled: shop?.enabled ?? true,
    menuEnabled: menu?.enabled ?? true,
    lastUpdated: {
      shop: shop?.lastUpdated ?? null,
      menu: menu?.lastUpdated ?? null,
    },
    updatedBy: {
      shop: shop?.updatedBy ?? null,
      menu: menu?.updatedBy ?? null,
    },
  });
}

export async function PATCH(request: Request) {
  const user = await getCognitoServerSession();
  if (!user || !isAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { shopEnabled: rawShop, menuEnabled: rawMenu } = body as {
    shopEnabled?: unknown;
    menuEnabled?: unknown;
  };

  if (rawShop === undefined && rawMenu === undefined) {
    return NextResponse.json({ error: "no_updates", message: "Provide shopEnabled and/or menuEnabled" }, { status: 400 });
  }

  if (rawShop !== undefined && typeof rawShop !== "boolean") {
    return NextResponse.json({ error: "shopEnabled must be boolean" }, { status: 400 });
  }
  if (rawMenu !== undefined && typeof rawMenu !== "boolean") {
    return NextResponse.json({ error: "menuEnabled must be boolean" }, { status: 400 });
  }

  await ensureDefaultAppSettings();

  const updatedBy = user.email ?? user.username ?? user.sub;

  if (rawShop !== undefined) {
    await prisma.appSetting.update({
      where: { settingId: APP_SETTING_SHOP_ENABLED },
      data: { enabled: rawShop, updatedBy },
    });
  }
  if (rawMenu !== undefined) {
    await prisma.appSetting.update({
      where: { settingId: APP_SETTING_MENU_ENABLED },
      data: { enabled: rawMenu, updatedBy },
    });
  }

  revalidateTag(MAINTENANCE_CACHE_TAG, "max");

  const next = await prisma.appSetting.findMany({
    where: { settingId: { in: [APP_SETTING_SHOP_ENABLED, APP_SETTING_MENU_ENABLED] } },
    select: { settingId: true, enabled: true },
  });
  const byId = Object.fromEntries(next.map((r) => [r.settingId, r.enabled] as const));

  return NextResponse.json({
    ok: true,
    shopEnabled: byId[APP_SETTING_SHOP_ENABLED] ?? true,
    menuEnabled: byId[APP_SETTING_MENU_ENABLED] ?? true,
  });
}
