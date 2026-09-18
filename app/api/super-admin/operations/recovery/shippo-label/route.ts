import { NextResponse } from "next/server";
import {
  governanceAuditActorForSuperStaff,
  resolveSuperStaffDelegation,
} from "@/lib/auth/cognito/requireSuperStaff";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { prisma } from "@/lib/prisma";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";
import { runShippoLabelPurchaseForShipment } from "@/lib/shipping/runShippoLabelPurchaseForShipment";

async function resolveSuperAdminShipmentId(raw: {
  shipmentId?: string | null;
  commerceOrderId?: string | null;
}): Promise<
  | { ok: true; shipmentId: string; commerceOrderId: string | null }
  | { ok: false; status: number; error: string; message?: string }
> {
  const shipmentIdTrim = raw.shipmentId?.trim() || "";
  const orderIdTrim = raw.commerceOrderId?.trim() || "";

  if (!shipmentIdTrim && !orderIdTrim) {
    return {
      ok: false,
      status: 400,
      error: "body_required",
      message: "Provide shipmentId or commerceOrderId",
    };
  }

  if (shipmentIdTrim) {
    const row = await prisma.shipment.findUnique({
      where: { id: shipmentIdTrim },
      select: { id: true, fulfillmentGroupId: true },
    });
    if (!row) {
      return { ok: false, status: 404, error: "shipment_not_found" };
    }
    const group = await prisma.fulfillmentGroup.findUnique({
      where: { id: row.fulfillmentGroupId },
      select: { orderId: true },
    });
    return { ok: true, shipmentId: row.id, commerceOrderId: group?.orderId ?? null };
  }

  const order = await prisma.commerceOrder.findUnique({
    where: { id: orderIdTrim },
    select: { id: true },
  });
  if (!order) {
    return { ok: false, status: 404, error: "commerce_order_not_found" };
  }

  const shipment = await prisma.shipment.findFirst({
    where: { fulfillmentGroup: { orderId: order.id } },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (!shipment) {
    return {
      ok: false,
      status: 404,
      error: "no_shipment_for_order",
      message: "No shipment rows found for this commerce order.",
    };
  }

  return { ok: true, shipmentId: shipment.id, commerceOrderId: order.id };
}

async function handler(req: Request) {
  const delegation = await resolveSuperStaffDelegation();
  if (!delegation.jwtUser || !isSuperAdmin(delegation.authorityUser ?? delegation.authorityGroups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }
  const auditActor =
    governanceAuditActorForSuperStaff(delegation) ?? {
      actorId: delegation.jwtUser.sub,
      actorName: delegation.jwtUser.email ?? delegation.jwtUser.username ?? "",
    };
  const actorSub = auditActor.actorId;
  const actorLabel = auditActor.actorName.trim() || actorSub;

  let body: { shipmentId?: string; commerceOrderId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json", code: "INVALID_JSON" }, { status: 400 });
  }

  const resolved = await resolveSuperAdminShipmentId(body);
  if (!resolved.ok) {
    return NextResponse.json(
      {
        error: resolved.error,
        message: resolved.message,
        code: resolved.error.toUpperCase(),
      },
      { status: resolved.status }
    );
  }

  const result = await runShippoLabelPurchaseForShipment({
    shipmentId: resolved.shipmentId,
    actor: { sub: actorSub, actorType: "super_admin" },
    emitSourceTag: "api.super-admin.operations.recovery.shippo-label",
    /** Break-glass: bypass optional `SHIPPO_REQUIRE_FULFILLMENT_APPROVAL` confirmation gate — audited in this handler. */
    skipFulfillmentApprovalCheck: true,
  });

  if (!result.ok) {
    await recordGovernanceAuditEntry({
      actionType: "OPERATIONS_SHIPPO_LABEL_RECOVERY_ATTEMPTED",
      category: "operations",
      actorId: actorSub,
      actorName: actorLabel,
      actorRole: "super_admin",
      targetType: "shipment",
      targetId: resolved.shipmentId,
      description: `Super-admin label recovery failed (${result.errorCode})`,
      metadata: {
        commerceOrderId: resolved.commerceOrderId,
        httpStatus: result.httpStatus,
        errorCode: result.errorCode,
      },
    });

    const payload: Record<string, unknown> = { ok: false, error: result.errorCode, code: result.errorCode.toUpperCase() };
    if (result.message) payload.message = result.message;
    return NextResponse.json(payload, { status: result.httpStatus });
  }

  await recordGovernanceAuditEntry({
    actionType: "OPERATIONS_SHIPPO_LABEL_RECOVERY_SUCCEEDED",
    category: "operations",
    actorId: actorSub,
    actorName: actorLabel,
    actorRole: "super_admin",
    targetType: "shipment",
    targetId: resolved.shipmentId,
    description: "Super-admin Shippo label purchased via recovery route",
    metadata: {
      commerceOrderId: resolved.commerceOrderId,
      trackingNumber: result.shipment.trackingNumber,
    },
  });

  return NextResponse.json({
    ok: true,
    shipmentId: result.shipment.id,
    commerceOrderId: resolved.commerceOrderId,
    shipment: result.shipment,
  });
}

export async function POST(req: Request) {
  return handler(req);
}

export async function PATCH(req: Request) {
  return handler(req);
}
