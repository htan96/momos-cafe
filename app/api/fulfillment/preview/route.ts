import { NextResponse } from "next/server";
import { buildFulfillmentSummary } from "@/lib/commerce/fulfillmentPreview";
import { partitionLinesForOrderWrite } from "@/lib/commerce/orderOrchestration";
import { parseUnifiedCartLines } from "@/lib/commerce/parseUnifiedCartLines";
import { cartHasBlockingIssues, validateUnifiedCart } from "@/lib/commerce/cartValidation";
import { getMaintenanceFlags } from "@/lib/app-settings/settings";
import { maintenanceBlockForUnifiedLines } from "@/lib/maintenance/unifiedCartMaintenance";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { lines?: unknown };
    const { lines, issues: parseIssues } = parseUnifiedCartLines(body.lines);

    const maint = maintenanceBlockForUnifiedLines(lines, await getMaintenanceFlags());
    if (maint) return maint;

    const preview = buildFulfillmentSummary(lines);
    const writePartitions = partitionLinesForOrderWrite(lines).map((g) => ({
      pipeline: g.pipeline,
      lineIds: g.lines.map((l) => l.lineId),
    }));

    const validationIssues =
      parseIssues.length === 0 ? validateUnifiedCart(lines) : [];

    return NextResponse.json({
      preview,
      writePartitions,
      parseIssues,
      validationIssues,
      persistBlocked:
        parseIssues.length > 0 || cartHasBlockingIssues(validationIssues),
    });
  } catch (e) {
    console.error("[fulfillment/preview POST]", e);
    return NextResponse.json({ error: "preview_failed" }, { status: 500 });
  }
}
