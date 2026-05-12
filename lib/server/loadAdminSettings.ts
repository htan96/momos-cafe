import { prisma } from "@/lib/prisma";
import {
  normalizeAdminSettingsJson,
  type AdminSettings,
  DEFAULT_SETTINGS,
} from "@/lib/adminSettings.model";

const ROW_ID = "default";

export async function loadAdminSettingsFromDb(): Promise<AdminSettings> {
  try {
    const row = await prisma.adminSettings.findUnique({
      where: { id: ROW_ID },
    });
    const data = row?.data;
    if (!data || typeof data !== "object") return DEFAULT_SETTINGS;
    return normalizeAdminSettingsJson({
      ...(data as Record<string, unknown>),
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}
