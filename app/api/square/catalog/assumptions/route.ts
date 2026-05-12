import { NextResponse } from "next/server";
import { SQUARE_COMMERCE_ASSUMPTIONS } from "@/lib/square/commerceCatalogAssumptions";

export async function GET() {
  return NextResponse.json({
    assumptions: SQUARE_COMMERCE_ASSUMPTIONS,
    sandboxDocs:
      "https://developer.squareup.com/docs/devtools/sandbox/overview",
  });
}
