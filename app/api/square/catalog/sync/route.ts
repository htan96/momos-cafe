import { NextResponse } from "next/server";
import { runProductionStoreCatalogSync } from "@/lib/square/storeCatalogSync";
import { jsonError } from "@/lib/server/apiErrors";
import { rateLimitHit, clientIp } from "@/lib/server/rateLimitMemory";

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
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[square/catalog/sync POST]", e);
    if (msg.includes("SQUARE_ENVIRONMENT")) {
      return jsonError(503, "SQUARE_ENV_MISMATCH", msg);
    }
    if (msg.includes("SQUARE_ACCESS_TOKEN")) {
      return jsonError(503, "SQUARE_TOKEN_MISSING", msg);
    }
    return jsonError(500, "STORE_SYNC_FAILED", msg.slice(0, 280));
  }
}
