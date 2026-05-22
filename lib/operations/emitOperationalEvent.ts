import type { Prisma } from "@prisma/client";
import { OperationalActivitySeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordOperationalEventSideEffects } from "@/lib/operations/incidentDetection";
import { OPERATIONAL_EVENT_TYPES, type OperationalEventType } from "@/lib/operations/operationalEventTypes";

export type EmitOperationalEventInput = {
  type: OperationalEventType;
  severity: OperationalActivitySeverity;
  actorType: "system" | "customer" | "admin" | "super_admin" | "service";
  actorId?: string | null;
  actorName?: string | null;
  message: string;
  metadata?: Prisma.InputJsonValue | null;
  source?: string | null;
  /** When omitted, uses root `prisma` client. */
  tx?: Prisma.TransactionClient;
  /** When true, skips `recordOperationalEventSideEffects` — use if caller handles incidents directly. */
  skipSideEffects?: boolean;
};

/** Convenience alias aligning app code with the Prisma enum name */
export type { OperationalActivitySeverity };

/**
 * Best-effort append to `OperationalActivityEvent`. Never throws — failures are logged server-side only.
 * Returns created row id, or **`null`** on failure.
 * When called with `tx`, does **not** schedule incident detection — run rules after commit if inserts must be visible.
 */
export async function emitOperationalEvent(input: EmitOperationalEventInput): Promise<string | null> {
  try {
    const db = input.tx ?? prisma;
    const row = await db.operationalActivityEvent.create({
      data: {
        type: input.type,
        severity: input.severity,
        actorType: input.actorType,
        actorId: input.actorId ?? undefined,
        actorName: input.actorName ?? undefined,
        message: input.message,
        metadata: input.metadata ?? undefined,
        source: input.source ?? undefined,
      },
      select: { id: true },
    });
    if (!input.tx && !input.skipSideEffects) {
      recordOperationalEventSideEffects(row.id, input.type);
    }
    return row.id;
  } catch (e) {
    console.error("[emitOperationalEvent]", input.type, e);
    return null;
  }
}

export function emitOrderCreatedEvent(args: {
  orderId: string;
  fulfillmentGroupsCreated: number;
  customerId?: string | null;
  tx?: Prisma.TransactionClient;
}): Promise<string | null> {
  return emitOperationalEvent({
    type: OPERATIONAL_EVENT_TYPES.ORDER_CREATED,
    severity: OperationalActivitySeverity.info,
    actorType: args.customerId ? "customer" : "system",
    actorId: args.customerId ?? undefined,
    message: "Draft commerce order created from storefront cart",
    metadata: {
      orderId: args.orderId,
      commerceOrderId: args.orderId,
      fulfillmentGroupsCreated: args.fulfillmentGroupsCreated,
    },
    source: "api.orders",
    tx: args.tx,
  });
}

export function emitPaymentTerminalEvent(args: {
  kind: "succeeded" | "failed";
  commerceOrderId: string | null;
  paymentRecordId: string;
  squarePaymentId: string;
  squareStatus: string;
  amountCents: number;
  /** Webhook delivery receipt row when this transition was driven by a correlated HTTP delivery. */
  receiptId?: string | null;
  tx?: Prisma.TransactionClient;
}): Promise<string | null> {
  const isOk = args.kind === "succeeded";
  const rid = args.receiptId?.trim();
  return emitOperationalEvent({
    type: isOk ? OPERATIONAL_EVENT_TYPES.PAYMENT_SUCCEEDED : OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED,
    severity: isOk ? OperationalActivitySeverity.info : OperationalActivitySeverity.warning,
    actorType: "service",
    message: isOk
      ? `Square payment completed for order${args.commerceOrderId ? ` ${args.commerceOrderId.slice(0, 8)}...` : ""}`
      : `Square payment failed (${args.squareStatus})`,
    metadata: {
      commerceOrderId: args.commerceOrderId,
      paymentRecordId: args.paymentRecordId,
      squarePaymentId: args.squarePaymentId,
      squareStatus: args.squareStatus,
      amountCents: args.amountCents,
      ...(rid
        ? {
            receiptId: rid,
            detail: { receiptId: rid },
            entities: {
              commerceOrderId: args.commerceOrderId ?? undefined,
              paymentRecordId: args.paymentRecordId,
            },
          }
        : {}),
    },
    source: "webhooks.square",
    tx: args.tx,
  });
}
