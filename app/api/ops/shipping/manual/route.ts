import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import { opsCan } from "@/lib/ops/permissions";

/**
 * Manual shipment row — linked to `FulfillmentGroup` (typically retail ship program).
 * Carrier APIs (Shippo, etc.) can attach here later via `metadata` or extra columns.
 */
export async function POST(req: Request) {
  const session = await getOpsSession();
  if (!session || !opsCan(session.role, "shipping:write")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: {
    fulfillmentGroupId?: string;
    carrier?: string;
    trackingNumber?: string;
    notes?: string;
    status?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const fulfillmentGroupId = body.fulfillmentGroupId?.trim();
  const carrier = body.carrier?.trim() ?? null;
  const trackingNumber = body.trackingNumber?.trim() ?? null;
  const notes = body.notes?.trim() ?? null;
  const status = body.status?.trim() || "pending";

  if (!fulfillmentGroupId || !trackingNumber) {
    return NextResponse.json({ error: "group_and_tracking_required" }, { status: 400 });
  }

  try {
    const group = await prisma.fulfillmentGroup.findUnique({
      where: { id: fulfillmentGroupId },
    });
    if (!group) return NextResponse.json({ error: "group_not_found" }, { status: 404 });

    const row = await prisma.shipment.create({
      data: {
        fulfillmentGroupId,
        carrier,
        trackingNumber,
        notes,
        status,
        shippedAt: status === "shipped" ? new Date() : null,
      },
    });

    return NextResponse.json({ ok: true, shipment: row });
  } catch (e) {
    console.error("[ops shipping manual]", e);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}
