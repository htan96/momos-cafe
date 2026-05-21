import { NextResponse } from "next/server";
import { runProductionStoreCatalogSync } from "@/lib/square/storeCatalogSync";
import { jsonError } from "@/lib/server/apiErrors";
import { rateLimitHit, clientIp } from "@/lib/server/rateLimitMemory";
import { OperationalActivitySeverity } from "@prisma/client";
import { emitOperationalEvent } from "@/lib/operations/emitOperationalEvent";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";

/**
 * Hydrates `product_cache` / `product_variant_cache` from LIVE Square catalog — Store category only.
 * Protected by `INTERNAL_API_SECRET` middleware + secondary IP throttle (multi-instance caveat applies).
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (rateLimitHit(`square:catalog_sync:${ip}`, { windowMs: 300_000, max: 8 })) {
    return jsonError(429, "RATE_LIMITED", "Too many catalog sync requests from this client");
  }

  try {
    const result = await runProductionStoreCatalogSync();
    await emitOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.MENU_SYNCED,
      severity: OperationalActivitySeverity.info,
      actorType: "service",
      message: "Square Store catalog synced to product cache",
      metadata: {
        storeCategorySquareId: result.storeCategorySquareId,
        itemsUpserted: result.itemsUpserted,
        variantsUpserted: result.variantsUpserted,
        imageObjectsResolved: result.imageObjectsResolved,
        inventoryVariantsChecked: result.inventoryVariantsChecked,
      },
      source: "api.square.catalog.sync",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[square/catalog/sync POST]", e);
    if (msg.includes("SQUARE_ENVIRONMENT")) {
      void emitPlatformEvent({
        subtype: PLATFORM_EVENT_SUBTYPE.MENU_SYNC_FAILED,
        category: "MENU_EVENT",
        lifecycle: "failed",
        severity: OperationalActivitySeverity.error,
        actorType: "service",
        message: "Square catalog sync aborted — environment configuration mismatch",
        detail: { code: "SQUARE_ENV_MISMATCH", reason: msg.slice(0, 280) },
        source: { handler: "POST app/api/square/catalog/sync" },
        sourceTag: "api.square.catalog.sync",
      });
      return jsonError(503, "SQUARE_ENV_MISMATCH", msg);
    }
    if (msg.includes("SQUARE_ACCESS_TOKEN")) {
      void emitPlatformEvent({
        subtype: PLATFORM_EVENT_SUBTYPE.MENU_SYNC_FAILED,
        category: "MENU_EVENT",
        lifecycle: "failed",
        severity: OperationalActivitySeverity.error,
        actorType: "service",
        message: "Square catalog sync aborted — access token unavailable",
        detail: { code: "SQUARE_TOKEN_MISSING", reason: msg.slice(0, 280) },
        source: { handler: "POST app/api/square/catalog/sync" },
        sourceTag: "api.square.catalog.sync",
      });
      return jsonError(503, "SQUARE_TOKEN_MISSING", msg);
    }
    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.MENU_SYNC_FAILED,
      category: "MENU_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.error,
      actorType: "service",
      message: "Square Store catalog hydration failed unexpectedly",
      detail: { code: "STORE_SYNC_FAILED", reason: msg.slice(0, 280) },
      source: { handler: "POST app/api/square/catalog/sync" },
      sourceTag: "api.square.catalog.sync",
    });
    return jsonError(500, "STORE_SYNC_FAILED", msg.slice(0, 280));
  }
}
