import { NextResponse } from "next/server";
import { OperationalActivitySeverity } from "@prisma/client";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";
import { emitOperationalEvent } from "@/lib/operations/emitOperationalEvent";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { runProductionStoreCatalogSync } from "@/lib/square/storeCatalogSync";
import { jsonError } from "@/lib/server/apiErrors";
import { rateLimitHit } from "@/lib/server/rateLimitMemory";

/**
 * Browser-callable Square catalog hydrate for super admins (avoids INTERNAL_API_SECRET gate on `/api/square/catalog/sync`).
 * Mirrors the internal route’s emits for observability parity.
 */
async function executeCatalogSync(actor: { sub: string; actorLabel: string }) {
  const result = await runProductionStoreCatalogSync();
  await emitOperationalEvent({
    type: OPERATIONAL_EVENT_TYPES.MENU_SYNCED,
    severity: OperationalActivitySeverity.info,
    actorType: "super_admin",
    actorId: actor.sub,
    message: "Square Store catalog synced to product cache",
    metadata: {
      storeCategorySquareId: result.storeCategorySquareId,
      itemsUpserted: result.itemsUpserted,
      variantsUpserted: result.variantsUpserted,
      imageObjectsResolved: result.imageObjectsResolved,
      inventoryVariantsChecked: result.inventoryVariantsChecked,
    },
    source: "api.super-admin.operations.recovery.catalog-sync",
  });
  await recordGovernanceAuditEntry({
    actionType: "OPERATIONS_CATALOG_SYNC_SUCCEEDED",
    category: "operations",
    actorId: actor.sub,
    actorName: actor.actorLabel,
    actorRole: "super_admin",
    description: "Super-admin triggered Square catalog sync",
    metadata: {
      variantsUpserted: result.variantsUpserted,
      itemsUpserted: result.itemsUpserted,
    },
  });
  return result;
}

export async function POST() {
  const user = await getCognitoServerSession();
  if (!user?.groups || !isSuperAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  if (rateLimitHit(`square:catalog_sync_super_admin:POST`, { windowMs: 300_000, max: 12 })) {
    return jsonError(429, "RATE_LIMITED", "Too many catalog sync requests — wait a few minutes.");
  }

  const actorLabel = user.email ?? user.username ?? user.sub;

  try {
    const result = await executeCatalogSync({ sub: user.sub, actorLabel });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[super-admin/catalog-sync POST]", e);
    await recordGovernanceAuditEntry({
      actionType: "OPERATIONS_CATALOG_SYNC_FAILED",
      category: "operations",
      actorId: user.sub,
      actorName: actorLabel,
      actorRole: "super_admin",
      description: `Super-admin catalog sync failed (${msg.slice(0, 120)})`,
      metadata: { truncatedError: msg.slice(0, 400) },
    });
    if (msg.includes("SQUARE_ENVIRONMENT")) {
      void emitPlatformEvent({
        subtype: PLATFORM_EVENT_SUBTYPE.MENU_SYNC_FAILED,
        category: "MENU_EVENT",
        lifecycle: "failed",
        severity: OperationalActivitySeverity.error,
        actorType: "super_admin",
        actorId: user.sub,
        message: "Square catalog sync aborted — environment configuration mismatch",
        detail: { code: "SQUARE_ENV_MISMATCH", reason: msg.slice(0, 280), trigger: "super_admin_recovery" },
        sourceTag: "api.super-admin.operations.recovery.catalog-sync",
      });
      return jsonError(503, "SQUARE_ENV_MISMATCH", msg);
    }
    if (msg.includes("SQUARE_ACCESS_TOKEN")) {
      void emitPlatformEvent({
        subtype: PLATFORM_EVENT_SUBTYPE.MENU_SYNC_FAILED,
        category: "MENU_EVENT",
        lifecycle: "failed",
        severity: OperationalActivitySeverity.error,
        actorType: "super_admin",
        actorId: user.sub,
        message: "Square catalog sync aborted — access token unavailable",
        detail: { code: "SQUARE_TOKEN_MISSING", reason: msg.slice(0, 280), trigger: "super_admin_recovery" },
        sourceTag: "api.super-admin.operations.recovery.catalog-sync",
      });
      return jsonError(503, "SQUARE_TOKEN_MISSING", msg);
    }
    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.MENU_SYNC_FAILED,
      category: "MENU_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.error,
      actorType: "super_admin",
      actorId: user.sub,
      message: "Square Store catalog hydration failed unexpectedly",
      detail: { code: "STORE_SYNC_FAILED", reason: msg.slice(0, 280), trigger: "super_admin_recovery" },
      sourceTag: "api.super-admin.operations.recovery.catalog-sync",
    });
    return jsonError(500, "STORE_SYNC_FAILED", msg.slice(0, 280));
  }
}

/** GET parity for quick browser automation / bookmarks — gated same as POST. */
export async function GET() {
  const user = await getCognitoServerSession();
  if (!user?.groups || !isSuperAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  if (rateLimitHit(`square:catalog_sync_super_admin:GET`, { windowMs: 300_000, max: 8 })) {
    return jsonError(429, "RATE_LIMITED", "Too many catalog sync requests — wait a few minutes.");
  }

  const actorLabel = user.email ?? user.username ?? user.sub;

  try {
    const result = await executeCatalogSync({ sub: user.sub, actorLabel });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[super-admin/catalog-sync GET]", e);
    await recordGovernanceAuditEntry({
      actionType: "OPERATIONS_CATALOG_SYNC_FAILED",
      category: "operations",
      actorId: user.sub,
      actorName: actorLabel,
      actorRole: "super_admin",
      description: `Super-admin catalog sync (GET) failed (${msg.slice(0, 120)})`,
      metadata: { truncatedError: msg.slice(0, 400) },
    });
    return jsonError(500, "STORE_SYNC_FAILED", msg.slice(0, 280));
  }
}
