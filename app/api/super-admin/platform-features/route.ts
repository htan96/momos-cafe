import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { PLATFORM_FEATURE_DEFINITIONS, PLATFORM_FEATURE_KEYS } from "@/lib/platform/governanceFeatures";
import {
  PLATFORM_FEATURES_CACHE_TAG,
  ensurePlatformFeatures,
  getPlatformFeatureState,
  loadPlatformFeatureStateUncached,
} from "@/lib/platform/platformFeatureState";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { writeGovernanceAudit } from "@/lib/governance/governanceAudit";

function isPlatformFeatureKey(v: string): v is (typeof PLATFORM_FEATURE_KEYS)[number] {
  return (PLATFORM_FEATURE_KEYS as readonly string[]).includes(v);
}

export async function GET() {
  const user = await getCognitoServerSession();
  if (!user?.groups || !isSuperAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  await ensurePlatformFeatures();
  const state = await getPlatformFeatureState();
  const features = PLATFORM_FEATURE_KEYS.map((key) => {
    const def = PLATFORM_FEATURE_DEFINITIONS[key];
    const row = state[key];
    return {
      key,
      title: def.title,
      description: def.description,
      rolloutNotes: def.rolloutNotes,
      defaultEnabled: def.defaultEnabled,
      allowOverrideRoles: def.allowOverrideRoles,
      enabled: row.enabled,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
    };
  });

  return NextResponse.json({ features });
}

export async function PATCH(request: Request) {
  const user = await getCognitoServerSession();
  if (!user?.groups || !isSuperAdmin(user.groups)) {
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

  const { features: rawFeatures } = body as { features?: unknown };
  if (!rawFeatures || typeof rawFeatures !== "object") {
    return NextResponse.json(
      { error: "features_required", message: "Body must include features object" },
      { status: 400 }
    );
  }

  const entries = Object.entries(rawFeatures).filter(([_, v]) => v !== undefined);
  if (entries.length === 0) {
    return NextResponse.json({ error: "no_updates", message: "Provide at least one feature key to update." }, {
      status: 400,
    });
  }

  for (const [k, v] of entries) {
    if (!isPlatformFeatureKey(k)) {
      return NextResponse.json({ error: `unknown_feature_key:${k}` }, { status: 400 });
    }
    if (typeof v !== "boolean") {
      return NextResponse.json({ error: `feature_value_must_be_boolean:${k}` }, { status: 400 });
    }
  }

  await ensurePlatformFeatures();
  const updatedBy = user.email ?? user.username ?? user.sub;

  await prisma.$transaction(
    entries.map(([key, enabled]) =>
      prisma.platformFeatureToggle.update({
        where: { key },
        data: { enabled, updatedBy },
      })
    )
  );

  await writeGovernanceAudit({
    type: "platform_feature_patch",
    actorSub: user.sub,
    actorEmail: updatedBy,
    meta: {
      changes: entries.map(([key, enabled]) => ({ key, enabled })),
    },
  });

  revalidateTag(PLATFORM_FEATURES_CACHE_TAG, "max");

  const state = await loadPlatformFeatureStateUncached();
  const merged = PLATFORM_FEATURE_KEYS.map((key) => ({
    key,
    enabled: state[key].enabled,
    updatedAt: state[key].updatedAt.toISOString(),
    updatedBy: state[key].updatedBy,
  }));

  return NextResponse.json({ ok: true, features: merged });
}
