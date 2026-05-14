import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  PLATFORM_FEATURE_DEFINITIONS,
  PLATFORM_FEATURE_KEYS,
  type PlatformFeatureKey,
} from "@/lib/platform/governanceFeatures";

export const PLATFORM_FEATURES_CACHE_TAG = "platform-features";

/**
 * Seeds missing rows without overwriting toggles touched in production.
 */
export async function ensurePlatformFeatures(): Promise<void> {
  for (const key of PLATFORM_FEATURE_KEYS) {
    const def = PLATFORM_FEATURE_DEFINITIONS[key];
    await prisma.platformFeatureToggle.upsert({
      where: { key },
      create: {
        key,
        enabled: def.defaultEnabled,
      },
      update: {},
    });
  }
}

export type GovernanceFeatureToggleRow = {
  enabled: boolean;
  updatedAt: Date;
  updatedBy: string | null;
};

export type PlatformFeatureState = Record<
  PlatformFeatureKey,
  GovernanceFeatureToggleRow & { key: PlatformFeatureKey }
>;

async function mergePlatformFeaturesFromDb(): Promise<PlatformFeatureState> {
  await ensurePlatformFeatures();
  const rows = await prisma.platformFeatureToggle.findMany({
    select: {
      key: true,
      enabled: true,
      updatedAt: true,
      updatedBy: true,
    },
  });
  const byKey = new Map(rows.map((r) => [r.key as PlatformFeatureKey, r]));

  const out = {} as PlatformFeatureState;
  for (const key of PLATFORM_FEATURE_KEYS) {
    const row = byKey.get(key);
    const def = PLATFORM_FEATURE_DEFINITIONS[key];
    out[key] = {
      key,
      enabled: row?.enabled ?? def.defaultEnabled,
      updatedAt: row?.updatedAt ?? new Date(0),
      updatedBy: row?.updatedBy ?? null,
    };
  }
  return out;
}

/**
 * Cached read for Server Components / layouts. Invalidate via `revalidateTag(PLATFORM_FEATURES_CACHE_TAG, "max")` after PATCH.
 */
export const getPlatformFeatureState = unstable_cache(mergePlatformFeaturesFromDb, ["platform-feature-state-v1"], {
  revalidate: 45,
  tags: [PLATFORM_FEATURES_CACHE_TAG],
});

/** Same merge as cached read, bypassing unstable_cache — for writes and dashboards that must see fresh timestamps. */
export async function loadPlatformFeatureStateUncached(): Promise<PlatformFeatureState> {
  return mergePlatformFeaturesFromDb();
}
