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
    const objects: unknown[] = [];
    for await (const obj of client.catalog.list({ types })) {
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
        modifierListDataKeys: (obj as { modifierListData?: object }).modifierListData
          ? Object.keys((obj as { modifierListData: object }).modifierListData)
          : null,
        modifierDataKeys: (obj as { modifierData?: object }).modifierData
          ? Object.keys((obj as { modifierData: object }).modifierData)
          : null,
      });
    }

    return NextResponse.json({
      count: objects.length,
      sample: objects.slice(0, 5),
      itemsWithModifierInfo: objects.filter((o: { type?: string; itemData?: { modifierListInfo?: unknown; modifier_list_info?: unknown } }) =>
        o.type === "ITEM" &&
        ((o as { itemData?: { modifierListInfo?: unknown; modifier_list_info?: unknown } }).itemData?.modifierListInfo ||
          (o as { itemData?: { modifierListInfo?: unknown; modifier_list_info?: unknown } }).itemData?.modifier_list_info)
      ).length,
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
