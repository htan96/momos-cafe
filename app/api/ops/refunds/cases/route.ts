import { NextResponse } from "next/server";
import { OperationalActivitySeverity, OperationalRefundCaseStatus } from "@prisma/client";
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

export async function GET(req: Request) {
  const session = await getOpsSession();
  if (!session || !opsCan(session.role, "support:write")) {
    return bad("forbidden", 403);
  }

  const commerceOrderId = new URL(req.url).searchParams.get("commerceOrderId")?.trim() ?? "";
  if (!OPS_ENTITY_UUID_RE.test(commerceOrderId)) {
    return bad("commerceOrderId_uuid_required");
  }

  const cases = await prisma.operationalRefundCase.findMany({
    where: { commerceOrderId },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      paymentRecord: { select: { id: true, squarePaymentId: true, amountCents: true } },
    },
  });

  return NextResponse.json({ cases });
}

export async function POST(req: Request) {
  const session = await getOpsSession();
  if (!session || !opsCan(session.role, "support:write")) {
    return bad("forbidden", 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return bad("invalid_json");
  }

  const commerceOrderId =
    typeof body.commerceOrderId === "string" ? body.commerceOrderId.trim() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const paymentRecordId =
    typeof body.paymentRecordId === "string" ? body.paymentRecordId.trim() : "";
  const supportIssueId =
    typeof body.supportIssueId === "string" ? body.supportIssueId.trim() : "";
  const internalNotes =
    typeof body.internalNotes === "string" ? body.internalNotes.trim() || null : null;

  if (!OPS_ENTITY_UUID_RE.test(commerceOrderId)) return bad("invalid_commerceOrderId");
  if (!reason) return bad("reason_required");

  const amtRaw = body.amountCents;
  const amountCents =
    typeof amtRaw === "number" && Number.isInteger(amtRaw) && amtRaw > 0 ? amtRaw : null;

  let paymentRow: {
    id: string;
    orderId: string | null;
    amountCents: number;
    squarePaymentId: string | null;
  } | null = null;

  if (paymentRecordId.length) {
    if (!OPS_ENTITY_UUID_RE.test(paymentRecordId)) return bad("invalid_paymentRecordId");
    const pr = await prisma.paymentRecord.findUnique({
      where: { id: paymentRecordId },
      select: {
        id: true,
        orderId: true,
        amountCents: true,
        squarePaymentId: true,
      },
    });
    if (!pr?.orderId || pr.orderId !== commerceOrderId) {
      return bad("payment_not_on_order", 422);
    }
    paymentRow = pr;
    if (
      typeof amountCents === "number" &&
      typeof pr.amountCents === "number" &&
      amountCents > pr.amountCents
    ) {
      return bad("amount_exceeds_capture", 422);
    }
  } else if (amountCents != null) {
    return bad("paymentRecordId_required_with_amount_override");
  }

  let supportIssueFk: string | null = null;
  if (supportIssueId.length) {
    const issue = await prisma.operationalSupportIssue.findUnique({
      where: { id: supportIssueId },
    });
    if (!issue) return bad("support_issue_not_found", 404);
    if (
      issue.commerceOrderId &&
      OPS_ENTITY_UUID_RE.test(issue.commerceOrderId) &&
      issue.commerceOrderId !== commerceOrderId
    ) {
      return bad("support_issue_wrong_order", 422);
    }
    supportIssueFk = supportIssueId;
  }

  const ord = await prisma.commerceOrder.findUnique({
    where: { id: commerceOrderId },
    select: { id: true },
  });
  if (!ord) return bad("commerce_order_not_found", 404);

  const refundCase = await prisma.operationalRefundCase.create({
    data: {
      status: OperationalRefundCaseStatus.REQUESTED,
      commerceOrderId,
      paymentRecordId: paymentRow?.id ?? null,
      amountCents,
      reason,
      internalNotes,
      supportIssueId: supportIssueFk,
      requestedByStaffSub: session.sub,
    },
    include: { paymentRecord: { select: { id: true, squarePaymentId: true } } },
  });

  await recordGovernanceAuditEntry({
    actionType: "OPERATIONAL_REFUND_CASE_UPDATED",
    category: "operations",
    actorId: session.sub,
    actorName: session.email,
    actorRole: session.roleBadge ?? "admin",
    targetType: "operational_refund_case",
    targetId: refundCase.id,
    description: "Refund coordination case requested (REQUESTED)",
    metadata: {
      commerceOrderId,
      paymentRecordId: paymentRow?.id ?? null,
      amountCents,
    },
  });

  void emitPlatformEvent({
    category: "PAYMENT_EVENT",
    subtype: PLATFORM_EVENT_SUBTYPE.REFUND_CASE_REQUESTED,
    lifecycle: "started",
    severity: OperationalActivitySeverity.info,
    actorType: session.roleBadge === "super_admin" ? "super_admin" : "admin",
    actorId: session.sub,
    actorName: session.email,
    message: `Operational refund coordination opened — ${commerceOrderId.slice(0, 8)}…`,
    entities: {
      commerceOrderId,
      ...(paymentRow?.id ? { paymentRecordId: paymentRow.id } : {}),
    },
    detail: {
      refundCaseId: refundCase.id,
      amountCents: amountCents ?? paymentRow?.amountCents ?? null,
    },
    source: { handler: "POST api/ops/refunds/cases" },
    sourceTag: "ops.refunds",
  });

  return NextResponse.json({ case: refundCase });
}
