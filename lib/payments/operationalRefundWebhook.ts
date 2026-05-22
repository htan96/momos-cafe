import { OperationalActivitySeverity, OperationalRefundCaseStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";

function mapRefundStatusToTerminalCaseStatus(status: string): OperationalRefundCaseStatus | null {
  const u = status.trim().toUpperCase();
  if (u === "COMPLETED") return OperationalRefundCaseStatus.SQUARE_COMPLETED;
  if (u === "FAILED" || u === "REJECTED") return OperationalRefundCaseStatus.SQUARE_FAILED;
  return null;
}

/**
 * Reconcile `OperationalRefundCase` rows when Square refund webhooks arrive.
 * Idempotent: duplicate completed webhooks do not regress state.
 */
export async function reconcileOperationalRefundCaseFromSquareWebhook(envelope: {
  refundId: string;
  paymentId: string;
  status: string;
}): Promise<{ updated: boolean; caseId?: string }> {
  let row =
    (await prisma.operationalRefundCase.findFirst({
      where: { squareRefundId: envelope.refundId },
    })) ?? null;

  if (!row) {
    const paymentRow = await prisma.paymentRecord.findFirst({
      where: { squarePaymentId: envelope.paymentId },
      select: { id: true },
    });
    if (!paymentRow?.id) return { updated: false };

    row = await prisma.operationalRefundCase.findFirst({
      where: {
        paymentRecordId: paymentRow.id,
        status: OperationalRefundCaseStatus.SUBMITTED_TO_SQUARE,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!row) return { updated: false };

  const terminalNext = mapRefundStatusToTerminalCaseStatus(envelope.status);
  const u = envelope.status.trim().toUpperCase();

  const data: Prisma.OperationalRefundCaseUpdateInput = {
    squareRefundId: envelope.refundId,
  };

  if (
    row.status === OperationalRefundCaseStatus.SQUARE_COMPLETED &&
    terminalNext === OperationalRefundCaseStatus.SQUARE_COMPLETED
  ) {
    await prisma.operationalRefundCase.update({
      where: { id: row.id },
      data: { squareRefundId: envelope.refundId },
    });
    return { updated: false, caseId: row.id };
  }

  if (terminalNext === OperationalRefundCaseStatus.SQUARE_COMPLETED) {
    data.status = OperationalRefundCaseStatus.SQUARE_COMPLETED;
  } else if (terminalNext === OperationalRefundCaseStatus.SQUARE_FAILED) {
    data.status = OperationalRefundCaseStatus.SQUARE_FAILED;
  } else if (u === "PENDING" && row.status === OperationalRefundCaseStatus.SUBMITTED_TO_SQUARE) {
    /* keep SUBMITTED_TO_SQUARE — only attach authoritative refund id */
  } else {
    return { updated: false, caseId: row.id };
  }

  const updatedRow = await prisma.operationalRefundCase.update({
    where: { id: row.id },
    data,
  });

  if (updatedRow.status === OperationalRefundCaseStatus.SQUARE_COMPLETED) {
    void emitPlatformEvent({
      category: "PAYMENT_EVENT",
      subtype: PLATFORM_EVENT_SUBTYPE.REFUND_CASE_SQUARE_COMPLETED,
      lifecycle: "succeeded",
      severity: OperationalActivitySeverity.info,
      actorType: "service",
      message: "Square refund reached completed state (webhook)",
      entities: { commerceOrderId: updatedRow.commerceOrderId },
      detail: {
        refundCaseId: updatedRow.id,
        squareRefundId: envelope.refundId,
        squarePaymentId: envelope.paymentId,
        squareRefundStatus: envelope.status,
      },
      source: { handler: "reconcileOperationalRefundCaseFromSquareWebhook" },
      sourceTag: "webhooks.square",
    });
  } else if (updatedRow.status === OperationalRefundCaseStatus.SQUARE_FAILED) {
    void emitPlatformEvent({
      category: "PAYMENT_EVENT",
      subtype: PLATFORM_EVENT_SUBTYPE.REFUND_CASE_SQUARE_FAILED,
      lifecycle: "failed",
      severity: OperationalActivitySeverity.warning,
      actorType: "service",
      message: "Square refund failed or rejected (webhook)",
      entities: { commerceOrderId: updatedRow.commerceOrderId },
      detail: {
        refundCaseId: updatedRow.id,
        squareRefundId: envelope.refundId,
        squarePaymentId: envelope.paymentId,
        squareRefundStatus: envelope.status,
      },
      source: { handler: "reconcileOperationalRefundCaseFromSquareWebhook" },
      sourceTag: "webhooks.square",
    });
  }

  const changedStatus = updatedRow.status !== row.status;
  return { updated: changedStatus || !!terminalNext || u === "PENDING", caseId: updatedRow.id };
}
