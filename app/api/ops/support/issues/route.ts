import { NextResponse } from "next/server";
import { OperationalActivitySeverity, OperationalSupportIssueStatus } from "@prisma/client";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import { opsCan } from "@/lib/ops/permissions";
import { OPS_ENTITY_UUID_RE } from "@/lib/operations/operationalContextLinks";
import { prisma } from "@/lib/prisma";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";

export const runtime = "nodejs";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

async function shipmentBelongsToOrder(shipmentId: string, commerceOrderId: string): Promise<boolean> {
  const hit = await prisma.shipment.findFirst({
    where: { id: shipmentId, fulfillmentGroup: { orderId: commerceOrderId } },
    select: { id: true },
  });
  return Boolean(hit);
}

export async function GET(req: Request) {
  const session = await getOpsSession();
  if (!session || !opsCan(session.role, "support:write")) {
    return bad("forbidden", 403);
  }

  const { searchParams } = new URL(req.url);
  const commerceOrderId = searchParams.get("commerceOrderId")?.trim() ?? "";

  if (!OPS_ENTITY_UUID_RE.test(commerceOrderId)) {
    return bad("commerceOrderId_uuid_required");
  }

  const issues = await prisma.operationalSupportIssue.findMany({
    where: { commerceOrderId },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      refundCases: { select: { id: true, status: true }, take: 6 },
    },
  });

  return NextResponse.json({ issues });
}

export async function POST(req: Request) {
  const session = await getOpsSession();
  if (!session || !opsCan(session.role, "support:write")) {
    return bad("forbidden", 403);
  }

  let row: Record<string, unknown>;
  try {
    row = (await req.json()) as Record<string, unknown>;
  } catch {
    return bad("invalid_json");
  }

  const title = typeof row.title === "string" ? row.title.trim() : "";
  if (!title) return bad("title_required");

  const statusRaw =
    typeof row.status === "string" && row.status.trim() ?
      row.status.trim().toUpperCase()
    : OperationalSupportIssueStatus.OPEN;

  let status: OperationalSupportIssueStatus = OperationalSupportIssueStatus.OPEN;
  if (
    typeof statusRaw === "string" &&
    (Object.values(OperationalSupportIssueStatus) as string[]).includes(statusRaw as OperationalSupportIssueStatus)
  ) {
    status = statusRaw as OperationalSupportIssueStatus;
  }

  const commerceOrderId =
    typeof row.commerceOrderId === "string" ? row.commerceOrderId.trim() || null : null;
  const customerId = typeof row.customerId === "string" ? row.customerId.trim() || null : null;
  const shipmentId = typeof row.shipmentId === "string" ? row.shipmentId.trim() || null : null;
  const cateringInquiryId =
    typeof row.cateringInquiryId === "string" ? row.cateringInquiryId.trim() || null : null;
  const summary = typeof row.summary === "string" ? row.summary.trim() || null : null;
  const assignedToStaffSub =
    typeof row.assignedToStaffSub === "string" ? row.assignedToStaffSub.trim() || null : null;

  if (commerceOrderId && !OPS_ENTITY_UUID_RE.test(commerceOrderId)) return bad("invalid_commerceOrderId");
  if (customerId && !OPS_ENTITY_UUID_RE.test(customerId)) return bad("invalid_customerId");
  if (shipmentId && !OPS_ENTITY_UUID_RE.test(shipmentId)) return bad("invalid_shipmentId");
  if (cateringInquiryId && !OPS_ENTITY_UUID_RE.test(cateringInquiryId)) return bad("invalid_cateringInquiryId");

  if (shipmentId && commerceOrderId) {
    const ok = await shipmentBelongsToOrder(shipmentId, commerceOrderId);
    if (!ok) return bad("shipment_not_on_order");
  }

  if (commerceOrderId) {
    const ord = await prisma.commerceOrder.findUnique({ where: { id: commerceOrderId }, select: { id: true } });
    if (!ord) return bad("commerce_order_not_found", 404);
  }

  if (commerceOrderId && customerId) {
    const ord = await prisma.commerceOrder.findUnique({
      where: { id: commerceOrderId },
      select: { customerId: true },
    });
    if (ord?.customerId && ord.customerId !== customerId) {
      return bad("customer_order_mismatch");
    }
  }

  const issue = await prisma.operationalSupportIssue.create({
    data: {
      status,
      title,
      summary,
      commerceOrderId,
      customerId,
      shipmentId,
      cateringInquiryId,
      createdByStaffSub: session.sub,
      assignedToStaffSub,
    },
  });

  await recordGovernanceAuditEntry({
    actionType: "OPERATIONAL_SUPPORT_ISSUE_UPDATED",
    category: "operations",
    actorId: session.sub,
    actorName: session.email,
    actorRole: session.roleBadge ?? "admin",
    targetType: "operational_support_issue",
    targetId: issue.id,
    description: `Support issue opened (${issue.status})`,
    metadata: { commerceOrderId, title: issue.title.slice(0, 200) },
  });

  void emitPlatformEvent({
    category: "ORDER_EVENT",
    subtype: PLATFORM_EVENT_SUBTYPE.SUPPORT_ISSUE_CREATED,
    lifecycle: "started",
    severity: OperationalActivitySeverity.info,
    actorType: session.roleBadge === "super_admin" ? "super_admin" : "admin",
    actorId: session.sub,
    actorName: session.email,
    message: `Support issue opened (${issue.status}) — ${issue.title}`,
    entities: { commerceOrderId: commerceOrderId ?? undefined },
    detail: {
      supportIssueId: issue.id,
      status: issue.status,
    },
    source: { handler: "POST api/ops/support/issues" },
    sourceTag: "ops.support",
  });

  return NextResponse.json({ issue });
}
