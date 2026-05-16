import { NextResponse } from "next/server";
import { buildFulfillmentSummary } from "@/lib/commerce/fulfillmentPreview";
import { partitionSubtotalsUsd, usdToCents } from "@/lib/commerce/orderMoney";
import { parseUnifiedCartLines } from "@/lib/commerce/parseUnifiedCartLines";
import { cartHasBlockingIssues, validateUnifiedCart } from "@/lib/commerce/cartValidation";
import { summarizeFulfillmentEligibility } from "@/lib/commerce/fulfillmentEligibility";
import { getMaintenanceFlags } from "@/lib/app-settings/settings";
import { maintenanceBlockForUnifiedLines } from "@/lib/maintenance/unifiedCartMaintenance";
import { governanceBlockCheckout } from "@/lib/governance/governanceControls";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { lines?: unknown };
    const { lines, issues: parseIssues } = parseUnifiedCartLines(body.lines);

    const govCheckout = await governanceBlockCheckout();
    if (govCheckout) return govCheckout;

    const maint = maintenanceBlockForUnifiedLines(lines, await getMaintenanceFlags());
    if (maint) return maint;

    const fulfillment = buildFulfillmentSummary(lines);
    const { kitchenUsd, retailUsd, totalUsd } = partitionSubtotalsUsd(lines);
    const eligibility = summarizeFulfillmentEligibility(lines);

    const validationIssues =
      parseIssues.length === 0 ? validateUnifiedCart(lines) : [];

    return NextResponse.json({
      fulfillment,
      eligibility,
      totals: {
        kitchenUsd,
        retailUsd,
        totalUsd,
        kitchenCents: usdToCents(kitchenUsd),
        retailCents: usdToCents(retailUsd),
        totalCents: usdToCents(totalUsd),
      },
      lineCount: lines.length,
      parseIssues,
      validationIssues,
      checkoutBlocked:
        parseIssues.length > 0 || cartHasBlockingIssues(validationIssues),
    });
  } catch (e) {
    console.error("[checkout/summary POST]", e);
    return NextResponse.json({ error: "summary_failed" }, { status: 500 });
  }
}
