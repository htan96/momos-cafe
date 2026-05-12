import { NextResponse } from "next/server";
import { merchCatalog } from "@/lib/merch/mockCatalog";

/** Bridge until Square-backed ProductCache drives `/shop`. */
export async function GET() {
  return NextResponse.json({
    source: "mock_catalog",
    count: merchCatalog.length,
    note: "Square catalog sync will hydrate ProductCache / ProductVariantCache — see POST /api/square/catalog/sync.",
  });
}
