import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { validateOrderStatusTransition } from "@/lib/commerce/orderLifecycle";
import { appendNotificationEvent } from "@/lib/notifications/notificationEvents";
import {
  emitOperationalEvent,
  emitPaymentTerminalEvent,
} from "@/lib/operations/emitOperationalEvent";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import type { PlatformEventMetadataV1 } from "@/lib/platform/events/metadata";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import {
  extractSquarePaymentWebhookEnvelope,
  inferLocalIdsFromPeekedWebhook,
} from "@/lib/webhooks/peekSquarePaymentFromWebhook";
import { OperationalActivitySeverity } from "@prisma/client";

export type SquarePaymentWebhookReconcileContext = {
  receiptId?: string | null;
  correlation?: PlatformEventMetadataV1["correlation"];
};

export type SquarePaymentWebhookReconcileResult = {
  ok: boolean;
  detail?: string;
  /** No `payment.*` envelope — reconcile intentionally skipped */
  nonPaymentEnvelope: boolean;
  /** Ran the transactional payment matching path */
  reconcileRan: boolean;
  /** Emitted `payment.square.orphan_webhook` platform event */
  orphanEmitted: boolean;
  commerceOrderId: string | null;
  paymentRecordId: string | null;
};

export async function registerPendingCommercePayment(input: {
  commerceOrderId: string;
  idempotencyKey: string;
  amountCents?: number;
}): Promise<{ payment: { id: string }; orderStatus: string }> {
  const key = input.idempotencyKey.trim();
  if (!key || key.length < 8) {
    throw new Error("INVALID_IDEMPOTENCY_KEY");
  }

  const trx = await prisma.$transaction(async (tx) => {
    const existing = await tx.paymentRecord.findUnique({
      where: { idempotencyKey: key },
      include: { order: true },
    });
    if (existing) {
      if (existing.orderId !== input.commerceOrderId) {
        throw new Error("IDEMPOTENCY_KEY_ORDER_MISMATCH");
      }
      return {
        created: false as const,
        payment: { id: existing.id },
        orderStatus: existing.order?.status ?? "unknown",
        registeredAmountCents: undefined as number | undefined,
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
      created: true as const,
      payment: { id: payment.id },
      orderStatus: refreshed?.status ?? "pending_payment",
      registeredAmountCents: amt,
    };
  });

  if (trx.created) {
    void emitOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.PAYMENT_PENDING_REGISTERED,
      severity: OperationalActivitySeverity.info,
      actorType: "customer",
      message: `Pending commerce payment shell registered (${trx.payment.id.slice(0, 8)}…)`,
      metadata: {
        commerceOrderId: input.commerceOrderId,
        paymentRecordId: trx.payment.id,
        amountCents: trx.registeredAmountCents ?? input.amountCents,
        idempotencyKey: input.idempotencyKey.trim(),
      },
      source: "registerPendingCommercePayment",
    });
  }

  return { payment: trx.payment, orderStatus: trx.orderStatus };
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
export async function reconcileSquarePaymentWebhook(
  rawBody: Record<string, unknown>,
  ctx?: SquarePaymentWebhookReconcileContext
): Promise<SquarePaymentWebhookReconcileResult> {
  const extracted = extractSquarePaymentWebhookEnvelope(rawBody);
  if (!extracted) {
    return {
      ok: true,
      detail: "ignored_non_payment_event",
      nonPaymentEnvelope: true,
      reconcileRan: false,
      orphanEmitted: false,
      commerceOrderId: null,
      paymentRecordId: null,
    };
  }

  const { squarePaymentId, status, referenceId } = extracted;

  type PendingTerminal = {
    kind: "succeeded" | "failed";
    commerceOrderId: string | null;
    paymentRecordId: string;
    squarePaymentId: string;
    squareStatus: string;
    amountCents: number;
  };

  let pendingTerminalEmit: PendingTerminal | undefined;
  let orphanWebhookEmit: { squarePaymentId: string; status: string; referenceId: string | null } | undefined;
  let matchedCommerceOrderId: string | null = null;
  let matchedPaymentRecordId: string | null = null;

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
      orphanWebhookEmit = {
        squarePaymentId,
        status,
        referenceId: referenceId ?? null,
      };
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

    matchedCommerceOrderId = record.orderId ?? null;
    matchedPaymentRecordId = record.id;

    const prevStatus = record.status;
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

    const becamePaid = mapped.paid && prevStatus !== "completed";
    const becameFailed = mapped.failed && prevStatus !== "failed";
    if ((becamePaid || becameFailed) && record) {
      pendingTerminalEmit = {
        kind: becamePaid ? "succeeded" : "failed",
        commerceOrderId: record.orderId ?? null,
        paymentRecordId: record.id,
        squarePaymentId,
        squareStatus: status,
        amountCents: record.amountCents,
      };
    }
  });

  if (orphanWebhookEmit) {
    const inferred = await inferLocalIdsFromPeekedWebhook({
      squarePaymentId: orphanWebhookEmit.squarePaymentId,
      referenceId: orphanWebhookEmit.referenceId ?? undefined,
    });
    const receiptId = ctx?.receiptId?.trim();
    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.PAYMENT_SQUARE_ORPHAN_WEBHOOK,
      category: "PAYMENT_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.warning,
      actorType: "service",
      message: "Square webhook payment could not be matched to a pending PaymentRecord",
      correlation: ctx?.correlation ?? {},
      entities: {
        commerceOrderId: inferred.commerceOrderId ?? undefined,
        paymentRecordId: inferred.paymentRecordId ?? undefined,
      },
      detail: {
        squarePaymentId: orphanWebhookEmit.squarePaymentId,
        squareStatus: orphanWebhookEmit.status,
        referenceId: orphanWebhookEmit.referenceId,
        ...(receiptId ? { receiptId } : {}),
      },
      source: { handler: "reconcileSquarePaymentWebhook" },
      sourceTag: "webhooks.square",
    });

    return {
      ok: true,
      nonPaymentEnvelope: false,
      reconcileRan: false,
      orphanEmitted: true,
      commerceOrderId: inferred.commerceOrderId,
      paymentRecordId: inferred.paymentRecordId,
    };
  }

  if (pendingTerminalEmit) {
    await emitPaymentTerminalEvent({
      ...pendingTerminalEmit,
      receiptId: ctx?.receiptId ?? null,
    });
  }

  return {
    ok: true,
    nonPaymentEnvelope: false,
    reconcileRan: true,
    orphanEmitted: false,
    commerceOrderId: pendingTerminalEmit?.commerceOrderId ?? matchedCommerceOrderId,
    paymentRecordId: pendingTerminalEmit?.paymentRecordId ?? matchedPaymentRecordId,
  };
}
