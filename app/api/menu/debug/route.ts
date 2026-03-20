import { NextResponse } from "next/server";
import { SquareClient, SquareEnvironment } from "square";

/**
 * Debug endpoint to inspect raw Square catalog structure.
 * Hit /api/menu/debug to see what Square returns for items and modifiers.
 */
export async function GET() {
  try {
    const token = process.env.SQUARE_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "No token" }, { status: 500 });
    }

    const client = new SquareClient({
      token,
      environment:
        process.env.SQUARE_ENVIRONMENT === "production"
          ? SquareEnvironment.Production
          : SquareEnvironment.Sandbox,
    });

    const types = "ITEM,MODIFIER_LIST,MODIFIER";
    const catalogPage = await client.catalog.list({ types });
    const objects: unknown[] = [];

    // Use SDK's built-in iteration (works at runtime; types may be incomplete)
    const iterable = catalogPage as AsyncIterable<{ type?: string; id?: string; isDeleted?: boolean; itemData?: object; modifierListData?: object; modifierData?: object }>;
    for await (const obj of iterable) {
      if (obj.isDeleted) continue;
      objects.push({
        type: obj.type,
        id: obj.id,
        keys: Object.keys(obj),
        itemDataKeys: obj.itemData ? Object.keys(obj.itemData as object) : null,
        itemData: obj.itemData
          ? JSON.parse(
              JSON.stringify(obj.itemData, (_, v) =>
                typeof v === "bigint" ? v.toString() : v
              )
            )
          : null,
        modifierListDataKeys: obj.modifierListData
          ? Object.keys(obj.modifierListData as object)
          : null,
        modifierDataKeys: obj.modifierData
          ? Object.keys(obj.modifierData as object)
          : null,
      });
    }

    return NextResponse.json({
      count: objects.length,
      sample: objects.slice(0, 5),
      itemsWithModifierInfo: objects.filter((o) => {
        const x = o as { type?: string; itemData?: { modifierListInfo?: unknown; modifier_list_info?: unknown } };
        return x.type === "ITEM" && !!(x.itemData?.modifierListInfo || x.itemData?.modifier_list_info);
      }).length,
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
