import { Prisma } from "@prisma/client";
import {
  OPS_ENTITY_UUID_RE,
  operationalIncidentWhereForCustomer,
} from "@/lib/operations/operationalContextLinks";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { prisma } from "@/lib/prisma";
import { isValidCustomerUuid } from "@/lib/accountManagement/loadAccountMgmtDetail";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 50;
/** “Stale signal” heuristic: no `commerce_orders.updated_at` touch this recently (profile-only churn excluded). */
export const CUSTOMER_DIRECTORY_STALE_DAYS = 90;

export type SuperAdminCustomerDirectoryFilters = {
  q?: string;
  page?: number;
  pageSize?: number;
  /** `any` | `has_orders` | `no_orders` */
  orders?: string;
  /** When `stale`, only rows with no fresh commerce order updates in {@link CUSTOMER_DIRECTORY_STALE_DAYS}. */
  activity?: string;
};

export type SuperAdminCustomerDirectoryRow = {
  id: string;
  email: string | null;
  phone: string | null;
  externalAuthSubject: string | null;
  authMetadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  orderCount: number;
  lastOrderAt: Date | null;
  lastOrderUpdatedAt: Date | null;
  openIncidentCount: number;
  failedPaymentCount: number;
  /** `CommerceOrder` in `draft` with at least one `PaymentRecord` in a failed-ish state — not a synthesized risk score. */
  draftPaymentIssueCount: number;
  /** True when a recent `payment.square.orphan_webhook` row referenced this customer id in metadata (bounded scan). */
  orphanWebhookHint: boolean;
  /** Commerce orders with `updated_at` activity in the last {@link CUSTOMER_DIRECTORY_STALE_DAYS} days. */
  ordersLast90Days: number;
  /** `PaymentRecord` rows (last {@link CUSTOMER_DIRECTORY_STALE_DAYS} days) on this customer's orders with failed-ish status — not a calibrated risk score. */
  failedPaymentsLast90dHint: number;
};

function staleCutoff(): Date {
  return new Date(Date.now() - CUSTOMER_DIRECTORY_STALE_DAYS * 24 * 60 * 60 * 1000);
}

function normalizeQuery(q: unknown): string {
  const s = typeof q === "string" ? q.trim() : "";
  return s.slice(0, 200);
}

export async function querySuperAdminCustomerDirectory(filters: SuperAdminCustomerDirectoryFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(5, filters.pageSize ?? DEFAULT_PAGE_SIZE));
  const rawQ = normalizeQuery(filters.q);

  const where: Prisma.CustomerWhereInput = {};
  const qLower = rawQ.toLowerCase();

  if (rawQ) {
    if (isValidCustomerUuid(rawQ)) {
      where.id = rawQ;
    } else {
      where.OR = [
        {
          email: {
            contains: rawQ,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        ...(qLower !== rawQ ?
          [{ email: { contains: qLower, mode: Prisma.QueryMode.insensitive } }]
        : []),
      ];
    }
  }

  const ordersFilter = filters.orders?.trim() ?? "";
  if (ordersFilter === "has_orders") {
    where.orders = { some: {} };
  } else if (ordersFilter === "no_orders") {
    where.orders = { none: {} };
  }

  if (filters.activity === "stale") {
    const cutoff = staleCutoff();
    where.NOT = {
      orders: {
        some: {
          updatedAt: { gte: cutoff },
        },
      },
    };
  }

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        phone: true,
        externalAuthSubject: true,
        authMetadata: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { orders: true } },
        orders: {
          take: 1,
          orderBy: { updatedAt: "desc" },
          select: {
            createdAt: true,
            updatedAt: true,
            status: true,
            payments: {
              select: { id: true, status: true, failureReason: true },
              take: 20,
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    }),
  ]);

  const ids = customers.map((c) => c.id);
  const emailById = new Map(
    customers.map((c) => [c.id, c.email?.trim().toLowerCase() ?? null] as const)
  );

  const recentWindowStart = staleCutoff();

  const [incidentAgg, orphanAgg, failingPaymentsAgg, orders90dAgg, recentFailingPaymentsAgg] =
    ids.length === 0 ?
      [[], [], [], [], []] as const
    : await Promise.all([
        Promise.all(
          ids.map(async (id) => {
            const mail = emailById.get(id) ?? null;
            const count = await prisma.operationalIncident.count({
              where: operationalIncidentWhereForCustomer(id, mail),
            });
            return { id, count };
          }),
        ),
        prisma.operationalActivityEvent.findMany({
          where: {
            type: PLATFORM_EVENT_SUBTYPE.PAYMENT_SQUARE_ORPHAN_WEBHOOK,
            OR: ids.flatMap((id) => [
              { metadata: { path: ["entities", "customerId"], equals: id } },
              { metadata: { path: ["customerId"], equals: id } },
            ]),
          },
          select: {
            metadata: true,
          },
          take: 500,
          orderBy: { createdAt: "desc" },
        }),
        prisma.paymentRecord.groupBy({
          by: ["orderId"],
          where: {
            order: { customerId: { in: ids } },
            OR: [
              { status: { equals: "failed", mode: Prisma.QueryMode.insensitive } },
              { failureReason: { not: null } },
            ],
          },
          _count: { _all: true },
        }),
        prisma.commerceOrder.groupBy({
          by: ["customerId"],
          where: {
            customerId: { in: ids },
            updatedAt: { gte: recentWindowStart },
          },
          _count: { _all: true },
        }),
        prisma.paymentRecord.groupBy({
          by: ["orderId"],
          where: {
            createdAt: { gte: recentWindowStart },
            order: { customerId: { in: ids } },
            OR: [
              { status: { equals: "failed", mode: Prisma.QueryMode.insensitive } },
              { failureReason: { not: null } },
            ],
          },
          _count: { _all: true },
        }),
      ]);

  const incidentCountByCustomer = new Map(incidentAgg.map((x) => [x.id, x.count]));

  /** Customers with orphan-webhook failures carrying their id in metadata (bounded scan). */
  const orphanCustomers = new Set<string>();
  for (const row of orphanAgg) {
    const meta = row.metadata as Record<string, unknown> | null;
    if (!meta || typeof meta !== "object") continue;
    const ent = meta.entities && typeof meta.entities === "object" ? (meta.entities as Record<string, unknown>) : {};
    const cid =
      typeof ent.customerId === "string" && OPS_ENTITY_UUID_RE.test(ent.customerId) ? ent.customerId
      : typeof meta.customerId === "string" && OPS_ENTITY_UUID_RE.test(meta.customerId) ? meta.customerId
      : null;
    if (cid && ids.includes(cid)) orphanCustomers.add(cid);
  }

  const orders90dByCustomer = new Map<string, number>(
    orders90dAgg.map((g) => [g.customerId as string, g._count._all])
  );

  const recentFailedPaymentsByCustomer = new Map<string, number>();
  if (recentFailingPaymentsAgg.length) {
    const recentOrderIds = [...new Set(recentFailingPaymentsAgg.map((g) => g.orderId).filter(Boolean))] as string[];
    const recentOrderRows =
      recentOrderIds.length ?
        await prisma.commerceOrder.findMany({
          where: { id: { in: recentOrderIds } },
          select: { id: true, customerId: true },
        })
      : [];
    const recentCustByOrder = new Map(recentOrderRows.map((o) => [o.id, o.customerId] as const));
    for (const g of recentFailingPaymentsAgg) {
      const cid = recentCustByOrder.get(g.orderId as string);
      if (!cid) continue;
      recentFailedPaymentsByCustomer.set(cid, (recentFailedPaymentsByCustomer.get(cid) ?? 0) + g._count._all);
    }
  }

  const failedPaymentsByCustomer = new Map<string, number>();
  if (failingPaymentsAgg.length) {
    const orderIds = [...new Set(failingPaymentsAgg.map((g) => g.orderId).filter(Boolean))] as string[];
    const orderRows =
      orderIds.length ?
        await prisma.commerceOrder.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, customerId: true },
        })
      : [];
    const custByOrder = new Map(orderRows.map((o) => [o.id, o.customerId] as const));
    for (const g of failingPaymentsAgg) {
      const cid = custByOrder.get(g.orderId as string);
      if (!cid) continue;
      failedPaymentsByCustomer.set(cid, (failedPaymentsByCustomer.get(cid) ?? 0) + g._count._all);
    }
  }

  const mapped: SuperAdminCustomerDirectoryRow[] = customers.map((c) => {
    const newest = c.orders[0];
    let draftIssue = 0;
    if (newest?.status === "draft" && newest.payments?.length) {
      for (const p of newest.payments) {
        const st = p.status?.trim().toLowerCase() ?? "";
        if (st === "failed" || p.failureReason?.trim()) draftIssue++;
      }
    }

    const lastOrderUpdatedAt = newest?.updatedAt ?? null;
    const lastOrderCreatedAt = newest?.createdAt ?? null;

    return {
      id: c.id,
      email: c.email,
      phone: c.phone,
      externalAuthSubject: c.externalAuthSubject,
      authMetadata: c.authMetadata,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      orderCount: c._count.orders,
      lastOrderAt: lastOrderCreatedAt,
      lastOrderUpdatedAt,
      openIncidentCount: incidentCountByCustomer.get(c.id) ?? 0,
      failedPaymentCount: failedPaymentsByCustomer.get(c.id) ?? 0,
      draftPaymentIssueCount: draftIssue,
      orphanWebhookHint: orphanCustomers.has(c.id),
      ordersLast90Days: orders90dByCustomer.get(c.id) ?? 0,
      failedPaymentsLast90dHint: recentFailedPaymentsByCustomer.get(c.id) ?? 0,
    };
  });

  return {
    items: mapped,
    total,
    page,
    pageSize,
  };
}
