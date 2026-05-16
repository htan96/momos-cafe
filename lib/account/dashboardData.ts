import { prisma } from "@/lib/prisma";
import type { DashboardOrderBrief } from "@/lib/account/orderPresentation";

const accountOrderInclude = {
  fulfillmentGroups: {
    include: {
      shipments: true,
      pickupWindow: true,
    },
  },
  payments: { orderBy: { createdAt: "desc" as const }, take: 5 },
  items: {
    take: 20,
    orderBy: { id: "asc" as const },
    select: {
      id: true,
      title: true,
      quantity: true,
      kind: true,
      fulfillmentPipeline: true,
      unitPriceCents: true,
    },
  },
} as const;

export type LoadedCommerceAccountOrder = NonNullable<Awaited<ReturnType<typeof loadCustomerCommerceOrder>>>;

export function mapToDashboardBrief(row: {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  totalCents: number;
  metadata: unknown;
  fulfillmentGroups: Array<{
    id: string;
    pipeline: string;
    status: string;
    estimatedReadyAt: Date | null;
    pickupWindow: { label: string; startsAt: Date; endsAt: Date } | null;
    shipments: Array<{
      id: string;
      status: string;
      carrier: string | null;
      trackingNumber: string | null;
      shippedAt: Date | null;
      shippingService: string | null;
      updatedAt: Date;
      createdAt: Date;
    }>;
  }>;
  payments: Array<{
    id: string;
    status: string;
    amountCents: number;
    capturedAt: Date | null;
    createdAt: Date;
    squarePaymentId: string | null;
  }>;
}): DashboardOrderBrief {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    totalCents: row.totalCents,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
    fulfillmentGroups: row.fulfillmentGroups.map((g) => ({
      id: g.id,
      pipeline: g.pipeline,
      status: g.status,
      estimatedReadyAt: g.estimatedReadyAt,
      pickupWindow: g.pickupWindow,
      shipments: g.shipments.map((s) => ({
        id: s.id,
        status: s.status,
        carrier: s.carrier,
        trackingNumber: s.trackingNumber,
        shippedAt: s.shippedAt,
        shippingService: s.shippingService,
        updatedAt: s.updatedAt,
        createdAt: s.createdAt,
      })),
    })),
    payments: row.payments.map((p) => ({
      id: p.id,
      status: p.status,
      amountCents: p.amountCents,
      capturedAt: p.capturedAt,
      createdAt: p.createdAt,
      squarePaymentId: p.squarePaymentId,
    })),
  };
}

export async function loadCustomerCommerceOrders(customerId: string) {
  return prisma.commerceOrder.findMany({
    where: { customerId, status: { not: "draft" } },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: accountOrderInclude,
  });
}

export async function loadCustomerCommerceOrder(customerId: string, orderId: string) {
  return prisma.commerceOrder.findFirst({
    where: { id: orderId, customerId, status: { not: "draft" } },
    include: accountOrderInclude,
  });
}

export async function loadCateringByEmail(customerEmail: string) {
  return prisma.cateringInquiry.findMany({
    where: {
      email: { equals: customerEmail, mode: "insensitive" },
      status: { not: "failed_submission" },
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
}
