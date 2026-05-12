import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { validateOrderStatusTransition } from "@/lib/commerce/orderLifecycle";
import { appendNotificationEvent } from "@/lib/notifications/notificationEvents";

export async function registerPendingCommercePayment(input: {
  commerceOrderId: string;
  idempotencyKey: string;
  amountCents?: number;
}): Promise<{ payment: { id: string }; orderStatus: string }> {
  const key = input.idempotencyKey.trim();
  if (!key || key.length < 8) {
    throw new Error("INVALID_IDEMPOTENCY_KEY");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.paymentRecord.findUnique({
      where: { idempotencyKey: key },
      include: { order: true },
    });
    if (existing) {
      if (existing.orderId !== input.commerceOrderId) {
        throw new Error("IDEMPOTENCY_KEY_ORDER_MISMATCH");
      }
      return {
        payment: { id: existing.id },
        orderStatus: existing.order?.status ?? "unknown",
      };
    }

    const order = await tx.commerceOrder.findUnique({ where: { id: input.commerceOrderId } });
    if (!order) throw new Error("ORDER_NOT_FOUND");

    const amt = input.amountCents ?? order.totalCents;
    if (amt !== order.totalCents) {
      throw new Error("AMOUNT_MISMATCH");
    }

    if (order.status === "draft") {
      const gate = validateOrderStatusTransition("draft", "pending_payment");
      if (!gate.ok) throw new Error(`ORDER_TRANSITION_BLOCKED:${gate.reason}`);
      await tx.commerceOrder.update({
        where: { id: order.id },
        data: { status: "pending_payment" },
      });
    } else if (order.status !== "pending_payment") {
      throw new Error(`ORDER_NOT_PAYABLE:${order.status}`);
    }

    const payment = await tx.paymentRecord.create({
      data: {
        orderId: order.id,
        amountCents: amt,
        currency: "USD",
        status: "pending",
        provider: "square",
        idempotencyKey: key,
        metadata: { phase: "awaiting_square_confirmation" } as Prisma.InputJsonValue,
      },
    });

    await appendNotificationEvent(
      "commerce.payment.pending_registered",
      {
        commerceOrderId: order.id,
        paymentId: payment.id,
        amountCents: amt,
      } as Prisma.InputJsonValue,
      tx
    );

    const refreshed = await tx.commerceOrder.findUnique({ where: { id: order.id } });
    return {
      payment: { id: payment.id },
      orderStatus: refreshed?.status ?? "pending_payment",
    };
  });
}

function extractPaymentEnvelope(body: Record<string, unknown>): {
  squarePaymentId: string;
  status: string;
  referenceId?: string;
} | null {
  const data = body.data as Record<string, unknown> | undefined;
  const obj = data?.object as Record<string, unknown> | undefined;
  const payment = (obj?.payment ?? obj) as Record<string, unknown> | undefined;

  const id = typeof payment?.id === "string" ? payment.id : undefined;
  const status = typeof payment?.status === "string" ? payment.status : undefined;
  const referenceId =
    typeof payment?.reference_id === "string"
      ? payment.reference_id
      : typeof payment?.referenceId === "string"
        ? payment.referenceId
        : undefined;

  if (!id || !status) return null;

  const rootType = typeof body.type === "string" ? body.type : "";
  if (rootType && !/^payment\./i.test(rootType)) {
    return null;
  }

  return { squarePaymentId: id, status, referenceId };
}

function paymentRecordSquareStatus(status: string): {
  recordStatus: string;
  squarePaymentStatus: string;
  paid: boolean;
  failed: boolean;
} {
  const upper = status.toUpperCase();
  if (upper === "COMPLETED" || upper === "APPROVED") {
    return { recordStatus: "completed", squarePaymentStatus: upper, paid: true, failed: false };
  }
  if (upper === "FAILED" || upper === "CANCELED" || upper === "VOIDED") {
    return { recordStatus: "failed", squarePaymentStatus: upper, paid: false, failed: true };
  }
  return { recordStatus: "pending", squarePaymentStatus: upper, paid: false, failed: false };
}

/** Idempotent webhook handler — links Square payments back to `PaymentRecord` + advances order when appropriate */
export async function reconcileSquarePaymentWebhook(rawBody: Record<string, unknown>): Promise<{
  ok: boolean;
  detail?: string;
}> {
  const extracted = extractPaymentEnvelope(rawBody);
  if (!extracted) {
    return { ok: true, detail: "ignored_non_payment_event" };
  }

  const { squarePaymentId, status, referenceId } = extracted;

  await prisma.$transaction(async (tx) => {
    let record =
      (await tx.paymentRecord.findFirst({
        where: { squarePaymentId },
      })) ??
      (referenceId
        ? await tx.paymentRecord.findFirst({
            where: {
              OR: [{ id: referenceId }, { idempotencyKey: referenceId }],
            },
          })
        : null);

    if (!record) {
      await appendNotificationEvent(
        "commerce.payment.webhook_orphan",
        {
          squarePaymentId,
          status,
          referenceId: referenceId ?? null,
        } as Prisma.InputJsonValue,
        tx
      );
      return;
    }

    const mapped = paymentRecordSquareStatus(status);

    await tx.paymentRecord.update({
      where: { id: record.id },
      data: {
        squarePaymentId,
        squarePaymentStatus: mapped.squarePaymentStatus,
        status: mapped.failed ? "failed" : mapped.recordStatus,
        capturedAt: mapped.paid ? new Date() : record.capturedAt,
        failureReason: mapped.failed ? `square:${mapped.squarePaymentStatus}` : record.failureReason,
      },
    });

    record = await tx.paymentRecord.findUnique({ where: { id: record.id } });

    if (mapped.paid && record?.orderId) {
      const order = await tx.commerceOrder.findUnique({ where: { id: record.orderId } });
      if (order?.status === "pending_payment") {
        const gate = validateOrderStatusTransition("pending_payment", "paid");
        if (gate.ok) {
          await tx.commerceOrder.update({
            where: { id: order.id },
            data: { status: "paid" },
          });
        }
      }
    }

    await appendNotificationEvent(
      "commerce.payment.square_webhook",
      {
        squarePaymentId,
        squareStatus: status,
        paymentRecordId: record?.id ?? null,
        commerceOrderId: record?.orderId ?? null,
      } as Prisma.InputJsonValue,
      tx
    );
  });

  return { ok: true };
}
