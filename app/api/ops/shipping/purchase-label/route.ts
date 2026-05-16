import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import { opsCan } from "@/lib/ops/permissions";
import { purchaseShippoLabel } from "@/lib/shipping/shippoClient";
import { OperationalActivitySeverity } from "@prisma/client";
import { emitOperationalEvent } from "@/lib/operations/emitOperationalEvent";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";

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
    const row = await prisma.shipment.findUnique({
      where: { id: shipmentId },
    });
    if (!row) {
      return NextResponse.json({ error: "shipment_not_found" }, { status: 404 });
    }

    const rateId = row.selectedShippoRateId?.trim();
    if (!rateId) {
      return NextResponse.json(
        { error: "no_rate_on_file", message: "This shipment has no saved carrier rate to purchase." },
        { status: 422 }
      );
    }

    if (row.trackingNumber && row.trackingNumber.trim().length > 0) {
      return NextResponse.json(
        { error: "already_shipped", message: "Tracking is already set on this shipment." },
        { status: 409 }
      );
    }

    const purchased = await purchaseShippoLabel(rateId);
    if (!purchased.ok) {
      console.error("[ops shipping purchase-label]", purchased.logDetail);
      return NextResponse.json(
        {
          error: "purchase_failed",
          message: "Could not buy the label — verify carrier accounts and rate freshness, then retry.",
        },
        { status: 502 }
      );
    }

    const metaBase =
      row.metadata && typeof row.metadata === "object" && row.metadata !== null && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};

    const mergedMeta = {
      ...metaBase,
      labelPurchaseAt: new Date().toISOString(),
      ...(purchased.labelUrl ? { labelUrl: purchased.labelUrl } : {}),
      ...(purchased.transactionId ? { carrierTransactionId: purchased.transactionId } : {}),
    };

    const carrierOut = purchased.carrier?.trim() || row.carrier;

    const hasProofOfPurchase = Boolean(purchased.trackingNumber?.trim() || purchased.labelUrl?.trim());

    const updated = await prisma.shipment.update({
      where: { id: row.id },
      data: {
        trackingNumber: purchased.trackingNumber?.trim() || row.trackingNumber,
        carrier: carrierOut ?? null,
        status: hasProofOfPurchase ? "shipped" : row.status,
        shippedAt: hasProofOfPurchase ? new Date() : row.shippedAt,
        metadata: mergedMeta as Prisma.InputJsonValue,
      },
    });

    await emitOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.SHIPMENT_LABEL_CREATED,
      severity: OperationalActivitySeverity.info,
      actorType: session.roleBadge === "super_admin" ? "super_admin" : "admin",
      actorId: session.sub,
      message: "Shippo label purchased for storefront shipment",
      metadata: {
        shipmentId: updated.id,
        carrier: updated.carrier,
        trackingNumber: updated.trackingNumber,
      },
      source: "api.ops.shipping.purchase-label",
    });

    return NextResponse.json({ ok: true, shipment: updated });
  } catch (e) {
    console.error("[ops shipping purchase-label]", e);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
