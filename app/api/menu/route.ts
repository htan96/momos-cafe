import { NextResponse } from "next/server";
import { getMenuFromSquare } from "@/lib/square";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const debugItemId = searchParams.get("debugItemId")?.trim() || undefined;

    const result = await getMenuFromSquare(
      debugItemId ? { debugItemId } : undefined
    );

    const headers = {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    } as const;

    if (debugItemId) {
      return NextResponse.json(
        {
          categories: result.categories,
          itemModifierDebug:
            result.debugItemComparison ?? {
              itemId: debugItemId,
              itemDataSource: "unavailable",
              batchModifierListInfo: null,
              listCatalogModifierListInfo: null,
              attachedModifierListIdsFromItemDataUsed: [],
              finalModifierGroups: [],
              finalModifierListIds: [],
              groupsNotBackedByListInfo: [],
              listInfoListIdsWithoutGroup: [],
              groupCount: 0,
              listInfoCount: 0,
              notFound: true,
            },
        },
        { headers }
      );
    }

    return NextResponse.json(result.categories, { headers });
  } catch (error) {
    console.error("Error fetching menu from Square:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu" },
      { status: 500 }
    );
  }
}
