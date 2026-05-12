import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  classifyFulfillmentProgram,
  OPS_FULFILLMENT_PROGRAM,
  type OpsFulfillmentProgram,
} from "@/lib/ops/fulfillmentPrograms";

const terminal = ["completed", "cancelled"] as const;

/** Shared fulfillment shape for ops queues — order totals optional where unused. */
export const opsFulfillmentGroupInclude = {
  order: {
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      totalCents: true,
    },
  },
  items: {
    include: {
      orderItem: { select: { payload: true, title: true, quantity: true } },
    },
  },
  shipments: { orderBy: { createdAt: "desc" }, take: 3 },
} satisfies Prisma.FulfillmentGroupInclude;

export type OpsFulfillmentGroupLoaded = Prisma.FulfillmentGroupGetPayload<{
  include: typeof opsFulfillmentGroupInclude;
}>;

export type OpsFulfillmentGroupEnriched = OpsFulfillmentGroupLoaded & {
  program: OpsFulfillmentProgram;
};

function enrichProgram(row: OpsFulfillmentGroupLoaded): OpsFulfillmentGroupEnriched {
  return {
    ...row,
    program: classifyFulfillmentProgram(row.pipeline, row.items),
  };
}

/** Dashboard queues — best-effort without fulfillment audit history. */
export async function opsLoadTodayQueues() {
  const stuckCutoff = new Date(Date.now() - 36 * 60 * 60 * 1000);

  const lateOrStuckRaw = await prisma.fulfillmentGroup.findMany({
    where: {
      status: { notIn: [...terminal] },
      AND: [
        { order: { status: { in: ["paid", "partially_fulfilled"] } } },
        {
          OR: [
            { order: { updatedAt: { lt: stuckCutoff } } },
            { estimatedReadyAt: { lt: new Date() } },
          ],
        },
      ],
    },
    take: 40,
    orderBy: { order: { updatedAt: "asc" } },
    include: opsFulfillmentGroupInclude,
  });

  const shipsTodayRaw = await prisma.fulfillmentGroup.findMany({
    where: {
      pipeline: "RETAIL",
      status: { notIn: [...terminal] },
      order: { status: { not: "draft" } },
    },
    take: 40,
    orderBy: { order: { createdAt: "desc" } },
    include: opsFulfillmentGroupInclude,
  });

  const shipsToday = shipsTodayRaw
    .map(enrichProgram)
    .filter((g) => g.program === OPS_FULFILLMENT_PROGRAM.SHIP);

  const cateringAttention = await prisma.cateringInquiry.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  const commFailures = await prisma.emailMessage.findMany({
    where: { deliveryStatus: "failed" },
    take: 15,
    orderBy: { createdAt: "desc" },
    include: {
      thread: { select: { id: true, commerceOrderId: true, subjectSnapshot: true } },
    },
  });

  return {
    lateOrStuck: lateOrStuckRaw.map(enrichProgram),
    shipsToday,
    cateringAttention,
    commFailures,
  };
}

export async function opsLoadFulfillmentBoard(program: OpsFulfillmentProgram) {
  if (program === OPS_FULFILLMENT_PROGRAM.CATERING) {
    const rows = await prisma.cateringInquiry.findMany({
      take: 80,
      orderBy: { createdAt: "desc" },
    });
    return { kind: "catering" as const, cateringRows: rows };
  }

  const groups = await prisma.fulfillmentGroup.findMany({
    where: {
      status: { notIn: [...terminal] },
      order: { status: { in: ["paid", "pending_payment", "partially_fulfilled"] } },
    },
    take: 120,
    orderBy: { order: { updatedAt: "desc" } },
    include: opsFulfillmentGroupInclude,
  });

  const enriched = groups.map(enrichProgram).filter((g) => {
    if (program === OPS_FULFILLMENT_PROGRAM.PICKUP) {
      return g.pipeline === "KITCHEN" || g.program === OPS_FULFILLMENT_PROGRAM.PICKUP;
    }
    return g.program === OPS_FULFILLMENT_PROGRAM.SHIP;
  });

  return { kind: "groups" as const, groups: enriched };
}

export async function opsLoadOrdersList(limit: number) {
  return prisma.commerceOrder.findMany({
    take: Math.min(80, Math.max(1, limit)),
    orderBy: { createdAt: "desc" },
    include: {
      fulfillmentGroups: { select: { id: true, pipeline: true, status: true } },
      payments: { select: { id: true, status: true, amountCents: true, createdAt: true } },
    },
  });
}

export async function opsLoadOrderDetail(id: string) {
  const order = await prisma.commerceOrder.findUnique({
    where: { id },
    include: {
      items: true,
      fulfillmentGroups: {
        include: {
          items: { include: { orderItem: true } },
          pickupWindow: true,
          shipments: { orderBy: { createdAt: "desc" } },
        },
      },
      payments: { orderBy: { createdAt: "desc" } },
      emailThreads: {
        orderBy: { updatedAt: "desc" },
        include: {
          messages: { orderBy: { createdAt: "asc" }, take: 50 },
        },
      },
    },
  });
  return order;
}

export async function opsLoadShippingQueue(): Promise<OpsFulfillmentGroupEnriched[]> {
  const groups = await prisma.fulfillmentGroup.findMany({
    where: {
      pipeline: "RETAIL",
      status: { in: ["pending", "merch_processing", "shipped"] },
    },
    take: 60,
    orderBy: { order: { updatedAt: "desc" } },
    include: opsFulfillmentGroupInclude,
  });
  return groups.map(enrichProgram).filter((g) => g.program === OPS_FULFILLMENT_PROGRAM.SHIP);
}

export async function opsLoadCommunicationsList(limit: number) {
  return prisma.emailThread.findMany({
    take: Math.min(100, Math.max(1, limit)),
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { id: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export async function opsLoadEmailThread(id: string) {
  return prisma.emailThread.findUnique({
    where: { id },
    include: {
      customer: true,
      commerceOrder: { select: { id: true, status: true, totalCents: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function opsLoadSettingsSnapshot() {
  const catalogSync = await prisma.catalogSyncState.findUnique({ where: { id: "singleton" } });
  const failedOutbound = await prisma.emailMessage.count({
    where: { deliveryStatus: "failed", direction: "outbound" },
  });
  const pendingOrchestrationEvents = await prisma.notificationEvent.count({
    where: { processedAt: null },
  });
  return { catalogSync, failedOutbound, pendingOrchestrationEvents };
}
