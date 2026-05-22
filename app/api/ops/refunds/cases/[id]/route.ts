import { NextResponse } from "next/server";
import { OperationalActivitySeverity, OperationalRefundCaseStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import { opsCan } from "@/lib/ops/permissions";
import { looksLikeOperationalCuid } from "@/lib/ops/cuidLooksLike";
import { prisma } from "@/lib/prisma";
import { submitOperationalRefundToSquare } from "@/lib/payments/submitOperationalRefundToSquare";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";

export const runtime = "nodejs";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function legalRefundTransition(prior: OperationalRefundCaseStatus, next: OperationalRefundCaseStatus): boolean {
  switch (prior) {
    case OperationalRefundCaseStatus.REQUESTED:
      return next === OperationalRefundCaseStatus.REVIEWING || next === OperationalRefundCaseStatus.DENIED;
    case OperationalRefundCaseStatus.REVIEWING:
      return (
        next === OperationalRefundCaseStatus.APPROVED ||
        next === OperationalRefundCaseStatus.DENIED ||
        next === OperationalRefundCaseStatus.REQUESTED
      );
    case OperationalRefundCaseStatus.APPROVED:
      return next === OperationalRefundCaseStatus.SUBMITTED_TO_SQUARE;
    default:
      return false;
  }
}

function subtypeForRefundStatus(status: OperationalRefundCaseStatus): string | null {
  switch (status) {
    case OperationalRefundCaseStatus.REVIEWING:
      return PLATFORM_EVENT_SUBTYPE.REFUND_CASE_REVIEWING;
    case OperationalRefundCaseStatus.APPROVED:
      return PLATFORM_EVENT_SUBTYPE.REFUND_CASE_APPROVED;
    case OperationalRefundCaseStatus.DENIED:
      return PLATFORM_EVENT_SUBTYPE.REFUND_CASE_DENIED;
    default:
      return null;
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getOpsSession();
  if (!session || !opsCan(session.role, "support:write")) {
    return bad("forbidden", 403);
  }

  const opsActorType = session.roleBadge === "super_admin" ? ("super_admin" as const) : ("admin" as const);

  const { id } = await ctx.params;
  if (!looksLikeOperationalCuid(id)) return bad("invalid_id");

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return bad("invalid_json");
  }

  const row = await prisma.operationalRefundCase.findUnique({
    where: { id },
    include: {
      paymentRecord: { select: { id: true, squarePaymentId: true, amountCents: true } },
    },
  });
  if (!row) return bad("not_found", 404);

  const nextInternalProvided = "internalNotes" in body;
  const nextInternalRaw = typeof body.internalNotes === "string" ? body.internalNotes.trim() || null : null;

  let nextStatusParsed: OperationalRefundCaseStatus | undefined;
  if (typeof body.status === "string" && body.status.trim()) {
    const up = body.status.trim().toUpperCase();
    const allowed = Object.values(OperationalRefundCaseStatus) as string[];
    if (!allowed.includes(up)) return bad("invalid_status");
    nextStatusParsed = up as OperationalRefundCaseStatus;
  }

  if (nextStatusParsed === undefined && !nextInternalProvided) {
    return bad("no_changes");
  }

  if (nextStatusParsed === undefined && nextInternalProvided) {
    const n = await prisma.operationalRefundCase.update({
      where: { id: row.id },
      data: { internalNotes: nextInternalRaw ?? null },
    });
    return NextResponse.json({ case: n });
  }

  /** From here onward `nextStatusParsed` is defined (`!` narrowing). */

  /** Square submission */
  if (nextStatusParsed === OperationalRefundCaseStatus.SUBMITTED_TO_SQUARE) {
    if (row.status !== OperationalRefundCaseStatus.APPROVED) {
      return NextResponse.json(
        { error: "submit_requires_approved_state", prior: row.status },
        { status: 422 }
      );
    }

    const sq = await submitOperationalRefundToSquare(row.id);

    if (!sq.ok) {
      await prisma.operationalRefundCase.update({
        where: { id: row.id },
        data: {
          status: OperationalRefundCaseStatus.SQUARE_FAILED,
          ...(nextInternalProvided ? { internalNotes: nextInternalRaw } : {}),
        },
      });

      await recordGovernanceAuditEntry({
        actionType: "OPERATIONAL_REFUND_CASE_UPDATED",
        category: "operations",
        actorId: session.sub,
        actorName: session.email,
        actorRole: session.roleBadge ?? "admin",
        targetType: "operational_refund_case",
        targetId: row.id,
        description: "Refund Square submission failed (SQUARE_FAILED)",
        metadata: { code: sq.code, message: sq.message },
      });

      void emitPlatformEvent({
        category: "PAYMENT_EVENT",
        subtype: PLATFORM_EVENT_SUBTYPE.REFUND_CASE_FAILED,
        lifecycle: "failed",
        severity: OperationalActivitySeverity.error,
        actorType: opsActorType,
        actorId: session.sub,
        actorName: session.email,
        message: `Square refunds API declined operational refund (${sq.code})`,
        entities: { commerceOrderId: row.commerceOrderId },
        detail: {
          refundCaseId: row.id,
          square: sq.square,
          code: sq.code,
          friendly: sq.message,
        },
        source: { handler: "PATCH api/ops/refunds/cases/[id]" },
        sourceTag: "ops.refunds",
      });

      const http = sq.code === "square_unconfigured" ? 503 : 502;
      return NextResponse.json({ error: sq.code, detail: sq }, { status: http });
    }

    const dataPatch: Prisma.OperationalRefundCaseUpdateInput = {
      status: sq.nextStatus,
      squareRefundId: sq.squareRefundId,
    };
    if (nextInternalProvided) dataPatch.internalNotes = nextInternalRaw ?? null;

    let latest = await prisma.operationalRefundCase.update({
      where: { id: row.id },
      data: dataPatch,
    });

    await recordGovernanceAuditEntry({
      actionType: "OPERATIONAL_REFUND_CASE_UPDATED",
      category: "operations",
      actorId: session.sub,
      actorName: session.email,
      actorRole: session.roleBadge ?? "admin",
      targetType: "operational_refund_case",
      targetId: latest.id,
      description:
        sq.nextStatus === OperationalRefundCaseStatus.SQUARE_COMPLETED ?
          "Refund finalized with Square synchronous COMPLETED status."
        : "Refund queued with Square (SUBMITTED_TO_SQUARE)",
      metadata: {
        squareRefundId: sq.squareRefundId,
        squareRefundStatus: sq.squareRefundStatus ?? null,
      },
    });

    void emitPlatformEvent({
      category: "PAYMENT_EVENT",
      subtype: PLATFORM_EVENT_SUBTYPE.REFUND_CASE_SUBMITTED_TO_SQUARE,
      lifecycle:
        sq.nextStatus === OperationalRefundCaseStatus.SQUARE_COMPLETED ? "succeeded" : "processing",
      severity: OperationalActivitySeverity.info,
      actorType: opsActorType,
      actorId: session.sub,
      actorName: session.email,
      message:
        sq.nextStatus === OperationalRefundCaseStatus.SQUARE_COMPLETED ?
          "Operational refund finalized immediately via Square synchronous response."
        : "Operational refund queued with Square.",
      entities: {
        commerceOrderId: latest.commerceOrderId,
        ...(latest.paymentRecordId ? { paymentRecordId: latest.paymentRecordId } : {}),
      },
      detail: {
        refundCaseId: latest.id,
        squareRefundId: sq.squareRefundId,
        squareRefundStatus: sq.squareRefundStatus,
      },
      source: { handler: "PATCH api/ops/refunds/cases/[id]" },
      sourceTag: "ops.refunds",
    });

    if (sq.nextStatus === OperationalRefundCaseStatus.SQUARE_COMPLETED) {
      void emitPlatformEvent({
        category: "PAYMENT_EVENT",
        subtype: PLATFORM_EVENT_SUBTYPE.REFUND_CASE_SQUARE_COMPLETED,
        lifecycle: "succeeded",
        severity: OperationalActivitySeverity.info,
        actorType: opsActorType,
        actorId: session.sub,
        actorName: session.email,
        message: `Refund coordination closed — synchronous Square COMPLETED.`,
        entities: { commerceOrderId: latest.commerceOrderId },
        detail: {
          refundCaseId: latest.id,
          squareRefundId: sq.squareRefundId,
        },
        source: { handler: "PATCH api/ops/refunds/cases/[id]" },
        sourceTag: "ops.refunds",
      });
    }

    const refreshed = await prisma.operationalRefundCase.findUnique({ where: { id: row.id } });
    if (!refreshed) return bad("lost_row", 500);
    return NextResponse.json({ case: refreshed });
  }

  if (nextStatusParsed === undefined) {
    return bad("no_changes");
  }

  /** Status-only transitions (omit Square instruction). */

  const nextStatusFinal = nextStatusParsed;

  if (nextStatusFinal === row.status) {
    const same = await prisma.operationalRefundCase.update({
      where: { id: row.id },
      data:
        nextInternalProvided ?
          {
            internalNotes: nextInternalRaw ?? null,
          }
        : {},
    });
    return NextResponse.json({ case: same });
  }

  if (!legalRefundTransition(row.status, nextStatusFinal)) {
    return NextResponse.json({ error: "illegal_transition", prior: row.status, next: nextStatusFinal }, { status: 422 });
  }

  const updateData: Prisma.OperationalRefundCaseUpdateInput = {
    status: nextStatusFinal,
  };

  if (nextStatusFinal === OperationalRefundCaseStatus.APPROVED) {
    updateData.approvedByStaffSub = session.sub;
  }

  if (nextInternalProvided) {
    updateData.internalNotes = nextInternalRaw ?? null;
  }

  const latest = await prisma.operationalRefundCase.update({
    where: { id: row.id },
    data: updateData,
  });

  await recordGovernanceAuditEntry({
    actionType: "OPERATIONAL_REFUND_CASE_UPDATED",
    category: "operations",
    actorId: session.sub,
    actorName: session.email,
    actorRole: session.roleBadge ?? "admin",
    targetType: "operational_refund_case",
    targetId: latest.id,
    description: `Refund coordination → ${latest.status}`,
    metadata: { priorStatus: row.status },
  });

  const stSub = subtypeForRefundStatus(latest.status);
  if (stSub) {
    void emitPlatformEvent({
      category: "PAYMENT_EVENT",
      subtype: stSub,
      lifecycle:
        latest.status === OperationalRefundCaseStatus.DENIED ? "cancelled" : ("processing" as const),
      severity:
        latest.status === OperationalRefundCaseStatus.DENIED ?
          OperationalActivitySeverity.warning
        : OperationalActivitySeverity.info,
      actorType: opsActorType,
      actorId: session.sub,
      actorName: session.email,
      message: `Operational refund coordination → ${latest.status}`,
      entities: {
        commerceOrderId: latest.commerceOrderId,
        ...(latest.paymentRecordId ? { paymentRecordId: latest.paymentRecordId } : {}),
      },
      detail: {
        refundCaseId: latest.id,
        priorStatus: row.status,
      },
      source: { handler: "PATCH api/ops/refunds/cases/[id]" },
      sourceTag: "ops.refunds",
    });
  }

  return NextResponse.json({ case: latest });
}
