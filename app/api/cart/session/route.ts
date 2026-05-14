import { NextResponse } from "next/server";
import { getGuestCartSession, upsertGuestCartSession } from "@/lib/server/cartSession";
import { parseUnifiedCartLines } from "@/lib/commerce/parseUnifiedCartLines";
import { cartHasBlockingIssues, validateUnifiedCart } from "@/lib/commerce/cartValidation";
import { getMaintenanceFlags } from "@/lib/app-settings/settings";
import { maintenanceBlockForUnifiedLines } from "@/lib/maintenance/unifiedCartMaintenance";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { guestToken?: string; lines?: unknown };
    const guestToken = body.guestToken?.trim();
    if (!guestToken) {
      return NextResponse.json({ error: "guestToken required" }, { status: 400 });
    }

    const { lines, issues: parseIssues } = parseUnifiedCartLines(body.lines);
    if (parseIssues.length > 0) {
      return NextResponse.json(
        { error: "invalid_cart_payload", parseIssues },
        { status: 422 }
      );
    }

    const maint = maintenanceBlockForUnifiedLines(lines, await getMaintenanceFlags());
    if (maint) return maint;

    const validationIssues = validateUnifiedCart(lines);
    if (cartHasBlockingIssues(validationIssues)) {
      return NextResponse.json(
        {
          error: "cart_validation_failed",
          validationIssues,
        },
        { status: 422 }
      );
    }

    const session = await upsertGuestCartSession(guestToken, lines);
    const warnings = validationIssues.filter((i) => i.severity === "warning");
    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      itemCount: session.items.length,
      warnings,
    });
  } catch (e) {
    console.error("[cart/session POST]", e);
    return NextResponse.json({ error: "cart_sync_failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const guestToken = new URL(req.url).searchParams.get("guestToken")?.trim();
  if (!guestToken) {
    return NextResponse.json({ error: "guestToken required" }, { status: 400 });
  }
  try {
    const session = await getGuestCartSession(guestToken);
    const now = new Date();
    const stale =
      !!session?.expiresAt && session.expiresAt.getTime() < now.getTime();
    return NextResponse.json({ session, stale });
  } catch (e) {
    console.error("[cart/session GET]", e);
    return NextResponse.json({ error: "cart_fetch_failed" }, { status: 500 });
  }
}
