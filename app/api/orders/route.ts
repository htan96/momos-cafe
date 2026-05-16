import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/auth/getCustomerSession";
import { prisma } from "@/lib/prisma";
import { parseUnifiedCartLines } from "@/lib/commerce/parseUnifiedCartLines";
import { cartHasBlockingIssues, validateUnifiedCart } from "@/lib/commerce/cartValidation";
import { createCommerceOrderWithGroups } from "@/lib/server/commerceOrderCreate";
import { loadAdminSettingsFromDb } from "@/lib/server/loadAdminSettings";
import { validateCartEligibilityFromAdminSettings } from "@/lib/ordering/validateCartEligibility";
import { verifyInternalSecretFromRequest } from "@/lib/server/internalAuth";
import { getMaintenanceFlags } from "@/lib/app-settings/settings";
import { maintenanceBlockForUnifiedLines } from "@/lib/maintenance/unifiedCartMaintenance";
import { emitOrderCreatedEvent } from "@/lib/operations/emitOperationalEvent";
import { governanceBlockUnifiedOrderPath } from "@/lib/governance/governanceControls";

/** Draft commerce order + fulfillment groups — validates payload strictly */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { guestToken?: string; lines?: unknown };

    const { lines, issues: parseIssues } = parseUnifiedCartLines(body.lines);
    if (parseIssues.length > 0) {
      return NextResponse.json({ error: "invalid_cart_payload", parseIssues }, { status: 422 });
    }
    if (lines.length === 0) {
      return NextResponse.json({ error: "lines required" }, { status: 400 });
    }

    const gov = await governanceBlockUnifiedOrderPath();
    if (gov) return gov;

    const maint = maintenanceBlockForUnifiedLines(lines, await getMaintenanceFlags());
    if (maint) return maint;

    const adminSettings = await loadAdminSettingsFromDb();
    const kitchenElig = validateCartEligibilityFromAdminSettings(
      new Date(),
      lines,
      adminSettings
    );
    const linesForOrder = kitchenElig.eligibleLines;
    if (linesForOrder.length === 0) {
      return NextResponse.json(
        {
          error: "no_eligible_checkout_lines",
          message:
            "Nothing in this bag can be paid for in the current kitchen window. Add shop items or return when food ordering opens.",
        },
        { status: 422 }
      );
    }
    if (linesForOrder.length !== lines.length) {
      console.warn(
        "[orders POST] Dropped ineligible kitchen lines from draft order payload",
        { before: lines.length, after: linesForOrder.length }
      );
    }

    const validationIssues = validateUnifiedCart(linesForOrder);
    if (cartHasBlockingIssues(validationIssues)) {
      return NextResponse.json(
        { error: "cart_validation_failed", validationIssues },
        { status: 422 }
      );
    }

    const warnings = validationIssues.filter((i) => i.severity === "warning");
    const customer = await getCustomerSession();
    const result = await createCommerceOrderWithGroups({
      lines: linesForOrder,
      guestCartToken: body.guestToken?.trim() ?? null,
      customerId: customer?.sub ?? null,
      metadata:
        warnings.length > 0
          ? { validationWarnings: warnings.map((w) => ({ code: w.code, message: w.message })) }
          : undefined,
    });

    await emitOrderCreatedEvent({
      orderId: result.orderId,
      fulfillmentGroupsCreated: result.fulfillmentGroupsCreated,
      customerId: customer?.sub ?? null,
    });

    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      fulfillmentGroupsCreated: result.fulfillmentGroupsCreated,
      warnings,
    });
  } catch (e) {
    console.error("[orders POST]", e);
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("MISSING_LINE_ID_IN_PAYLOAD") || msg.startsWith("missing_order_item_for_line")) {
      return NextResponse.json({ error: "order_integrity_failed", detail: msg }, { status: 500 });
    }
    return NextResponse.json({ error: "order_create_failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!verifyInternalSecretFromRequest(req)) {
    return NextResponse.json({ error: "unauthorized", code: "INTERNAL_AUTH_REQUIRED" }, { status: 401 });
  }

  const limit = Math.min(
    50,
    Math.max(1, Number(new URL(req.url).searchParams.get("limit") ?? "20"))
  );
  try {
    const orders = await prisma.commerceOrder.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        totalCents: true,
        kitchenSubtotalCents: true,
        retailSubtotalCents: true,
      },
    });
    return NextResponse.json({ orders });
  } catch (e) {
    console.error("[orders GET]", e);
    return NextResponse.json({ error: "order_list_failed" }, { status: 500 });
  }
}
