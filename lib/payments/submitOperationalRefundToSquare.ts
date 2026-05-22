import { OperationalRefundCaseStatus } from "@prisma/client";
import { SquareError } from "square";
import { prisma } from "@/lib/prisma";
import { resolveSquareClientFromEnv } from "@/lib/square/squareClientFromEnv";

function readRefund(payload: unknown): { id: string; status?: string | null } | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  const r = (o.refund ?? o.paymentRefund) as Record<string, unknown> | undefined;
  if (!r || typeof r !== "object" || typeof r.id !== "string") return null;
  const st =
    typeof r.status === "string" || r.status === null ?
      (r.status as string | null)
    : undefined;
  return { id: r.id, status: st };
}

export type SubmitOperationalRefundToSquareOutcome =
  | {
      ok: true;
      squareRefundId: string;
      nextStatus: OperationalRefundCaseStatus;
      squareRefundStatus: string | null | undefined;
    }
  | { ok: false; code: string; message: string; square?: unknown };

/**
 * Executes Square `RefundPayment` for an approved ops refund case row.
 */
export async function submitOperationalRefundToSquare(caseRowId: string): Promise<SubmitOperationalRefundToSquareOutcome> {
  const client = resolveSquareClientFromEnv();
  if (!client) {
    return {
      ok: false,
      code: "square_unconfigured",
      message: "SQUARE_ACCESS_TOKEN is missing or SQUARE_ENVIRONMENT is not set consistently with checkout.",
    };
  }

  const row = await prisma.operationalRefundCase.findUnique({
    where: { id: caseRowId },
    include: { paymentRecord: true },
  });

  if (!row?.paymentRecord?.squarePaymentId?.trim()) {
    return {
      ok: false,
      code: "square_payment_missing",
      message: "PaymentRecord is missing squarePaymentId — cannot instruct Square refund.",
    };
  }

  if (row.status !== OperationalRefundCaseStatus.APPROVED) {
    return { ok: false, code: "not_approved", message: `Refund case not approved (got ${row.status}).` };
  }

  const amountBase = row.amountCents ?? row.paymentRecord.amountCents;
  if (typeof amountBase !== "number" || amountBase < 1) {
    return { ok: false, code: "amount_invalid", message: "Refund amount must be positive whole cents." };
  }

  if (amountBase > row.paymentRecord.amountCents) {
    return {
      ok: false,
      code: "amount_exceeds_capture",
      message: `Refund amount (${amountBase}) exceeds PaymentRecord (${row.paymentRecord.amountCents}).`,
    };
  }

  const idempotencyKey = `momos-refund-case-${row.id}`;

  try {
    const envelope = await client.refunds.refundPayment({
      idempotencyKey,
      paymentId: row.paymentRecord.squarePaymentId.trim(),
      amountMoney: { amount: BigInt(amountBase), currency: "USD" },
      reason: row.reason.trim().slice(0, 192) || undefined,
    });

    const refund = readRefund(envelope);
    if (!refund?.id) {
      return {
        ok: false,
        code: "square_empty_refund",
        message: "Square accepted the HTTP round-trip but omitted `refund.id` in the envelope.",
        square: envelope,
      };
    }

    const st = refund.status?.trim().toUpperCase() ?? "";
    const nextStatus =
      st === "COMPLETED"
        ? OperationalRefundCaseStatus.SQUARE_COMPLETED
        : OperationalRefundCaseStatus.SUBMITTED_TO_SQUARE;

    return {
      ok: true,
      squareRefundId: refund.id,
      nextStatus,
      squareRefundStatus: refund.status,
    };
  } catch (e: unknown) {
    if (e instanceof SquareError) {
      const first = e.errors?.[0];
      const code = typeof first?.code === "string" ? first.code : "square_error";
      const friendly = `${e.message}${first?.detail ? `: ${first.detail}` : ""}`.slice(0, 500);
      return {
        ok: false,
        code,
        message: friendly,
        square: { statusCode: e.statusCode, errors: e.errors, body: e.body },
      };
    }

    const message = e instanceof Error ? e.message : "unknown_error";
    return { ok: false, code: "unexpected", message: message.slice(0, 320) };
  }
}
