import { NextResponse } from "next/server";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import { opsCan } from "@/lib/ops/permissions";
import { OperationalActivitySeverity } from "@prisma/client";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { runShippoLabelPurchaseForShipment } from "@/lib/shipping/runShippoLabelPurchaseForShipment";

/**
 * Purchase a shipping label for a pending storefront shipment row that has a stored rate id.
 */
export async function POST(req: Request) {
  const session = await getOpsSession();
  if (!session || !opsCan(session.role, "shipping:write")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { shipmentId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const shipmentId = body.shipmentId?.trim();
  if (!shipmentId) {
    return NextResponse.json({ error: "shipment_required" }, { status: 400 });
  }

  try {
    const result = await runShippoLabelPurchaseForShipment({
      shipmentId,
      actor: {
        sub: session.sub,
        actorType: session.roleBadge === "super_admin" ? "super_admin" : "admin",
      },
      emitSourceTag: "api.ops.shipping.purchase-label",
    });

    if (!result.ok) {
      const payload: Record<string, unknown> = { error: result.errorCode };
      if (result.message) payload.message = result.message;
      return NextResponse.json(payload, { status: result.httpStatus });
    }

    return NextResponse.json({ ok: true, shipment: result.shipment });
  } catch (e) {
    console.error("[ops shipping purchase-label]", e);
    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_LABEL_FAILED,
      category: "SHIPMENT_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.critical,
      actorType: session.roleBadge === "super_admin" ? "super_admin" : "admin",
      actorId: session.sub,
      message: "Unexpected error while purchasing Shippo label",
      entities: shipmentId ? { shipmentId } : {},
      detail: {
        reason: "unexpected_exception",
        errorName: e instanceof Error ? e.name : typeof e,
      },
      source: { handler: "POST app/api/ops/shipping/purchase-label" },
      sourceTag: "api.ops.shipping.purchase-label",
    });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
