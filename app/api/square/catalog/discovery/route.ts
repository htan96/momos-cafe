import { NextResponse } from "next/server";
import {
  analyzeCatalogSnapshot,
  buildAllItemInspections,
  buildCatalogSnapshot,
  buildCommerceGraph,
  createSquareClientFromEnv,
  inspectItem,
} from "@/lib/square/catalogDiscovery";
import { jsonError } from "@/lib/server/apiErrors";
import { rateLimitHit, clientIp } from "@/lib/server/rateLimitMemory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function jsonSafe<T>(body: T): NextResponse {
  return NextResponse.json(
    JSON.parse(
      JSON.stringify(body, (_, v) => (typeof v === "bigint" ? v.toString() : v))
    )
  );
}

/**
 * READ-ONLY Square catalog introspection (no catalog mutations).
 *
 * Auth: `INTERNAL_API_SECRET` via middleware (same as store sync).
 *
 * Query:
 * - `mode=summary` (default) — report + graph with items truncated (40 rows)
 * - `mode=full` — report + full graph + all ItemInspection records (large JSON)
 * - `mode=item&itemId=<Square ITEM id>` — single item deep inspection
 * - `includeInventory=1` — optional inventory batch counts (uses SQUARE_LOCATION_ID)
 */
export async function GET(req: Request) {
  const ip = clientIp(req);
  if (rateLimitHit(`square:catalog_discovery:${ip}`, { windowMs: 300_000, max: 6 })) {
    return jsonError(429, "RATE_LIMITED", "Too many catalog discovery requests from this client");
  }

  try {
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") ?? "summary").toLowerCase();
    const includeInventory = searchParams.get("includeInventory") === "1";
    const itemId = searchParams.get("itemId")?.trim();

    const client = createSquareClientFromEnv();
    const snapshot = await buildCatalogSnapshot(client);
    const report = await analyzeCatalogSnapshot(snapshot, client, { includeInventory });
    const graph = buildCommerceGraph(snapshot, report);

    if (mode === "item") {
      if (!itemId) {
        return jsonError(400, "MISSING_ITEM_ID", "Pass itemId for mode=item");
      }
      const item = inspectItem(itemId, snapshot.byId);
      return jsonSafe({
        ok: true,
        mode: "item",
        itemId,
        item,
        reportCounts: {
          items: report.items.totalItems,
          categories: report.countsByType["CATEGORY"] ?? 0,
          modifiers: report.modifiers,
        },
      });
    }

    if (mode === "full") {
      const itemsDetailed = buildAllItemInspections(snapshot);
      return jsonSafe({
        ok: true,
        mode: "full",
        report,
        graph,
        itemsDetailed,
      });
    }

    const ITEM_PREVIEW = 40;
    return jsonSafe({
      ok: true,
      mode: "summary",
      report,
      graph: {
        ...graph,
        items: graph.items.slice(0, ITEM_PREVIEW),
        _itemsTotal: graph.items.length,
        _itemsTruncated: graph.items.length > ITEM_PREVIEW,
      },
      hints: {
        docs: "/docs/SQUARE_CATALOG_ARCHITECTURE.md",
        fullMode: "Add ?mode=full for complete item inspections (large payload).",
        itemMode: "Add ?mode=item&itemId=<CATALOG_ITEM_ID> for modifier linkage audit on one row.",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[square/catalog/discovery GET]", e);
    if (msg.includes("SQUARE_ACCESS_TOKEN")) {
      return jsonError(503, "SQUARE_TOKEN_MISSING", msg);
    }
    return jsonError(500, "CATALOG_DISCOVERY_FAILED", msg.slice(0, 400));
  }
}
