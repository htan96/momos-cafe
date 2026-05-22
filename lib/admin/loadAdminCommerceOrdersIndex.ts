import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** Default page size for `/admin/orders` (documented in the page chrome). */
export const ADMIN_COMMERCE_ORDERS_DEFAULT_PAGE_SIZE = 25;

/** Upper bound clamp for `pageSize` search param. */
export const ADMIN_COMMERCE_ORDERS_MAX_PAGE_SIZE = 80;

/**
 * Rolling **placement** window: orders with `commerce_orders.created_at` on/after this UTC midnight
 * baseline (today minus N whole days).
 */
export const ADMIN_COMMERCE_ORDERS_DEFAULT_WINDOW_DAYS = 30;

const POST_PAYMENT_ORDER_STATUSES = ["paid", "partially_fulfilled", "fulfilled"] as const;

function clampInt(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(Math.max(Math.floor(n), lo), hi);
}

/** Start of UTC day, then subtract `daysBack` calendar days (minimum 1, max 366). */
export function adminCommerceOrdersWindowStartUtc(daysBack: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  const bounded = clampInt(daysBack, 1, 366);
  d.setUTCDate(d.getUTCDate() - bounded);
  return d;
}

function parseQueryInt(raw: string | undefined, fallback: number): number {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export type AdminCommerceOrdersIndexRow = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  clientLabel: string;
  fulfillmentGroupCount: number;
  /** Distinct pipelines from FulfillmentGroup rows (e.g. KITCHEN, RETAIL). */
  fulfillmentPipelines: string[];
};

export type AdminCommerceOrdersIndexPayload = {
  operationalLens: boolean;
  rows: AdminCommerceOrdersIndexRow[];
  /** Rows returned for the current page. */
  pageCount: number;
  /** Matching rows across all pages for this query (same filters + placement window). */
  totalMatching: number;
  page: number;
  pageSize: number;
  windowDays: number;
  windowStartsAtUtc: Date;
};

function customerSummaryFromRow(row: {
  customer: {
    email: string | null;
    phone: string | null;
    authMetadata: unknown;
  } | null;
}): string {
  const c = row.customer;
  if (!c) return "—";
  let name: string | null = null;
  if (c.authMetadata && typeof c.authMetadata === "object" && !Array.isArray(c.authMetadata)) {
    const am = c.authMetadata as Record<string, unknown>;
    const raw = am.fullName ?? am.name ?? am.displayName;
    name = typeof raw === "string" && raw.trim() ? raw.trim() : null;
  }
  const email = c.email?.trim() || null;
  if (name && email) return `${name} · ${email}`;
  if (email) return email;
  if (name) return name;
  if (c.phone?.trim()) return c.phone.trim();
  return "—";
}

/**
 * Loads paginated storefront commerce orders for `/admin/orders`.
 *
 * • **Regular admin** (`operationalLens: false`): only orders that already have ≥1 FulfillmentGroup row (“partition”), a terminal-ish PSP mirror (`payment_records.status = completed`), coarse order status past checkout
 *   (`paid` / `partially_fulfilled` / `fulfilled`), placed inside the UTC placement window (`created_at`).
 * • **Super-admin operational lens** (`operationalLens: true`): drops payment + fulfillment-group predicates so drafts
 *   and unpaid shells remain visible inside the window for parity with exploratory tooling (`/super-admin/order-operations`).
 */
export async function loadAdminCommerceOrdersIndex(input: {
  operationalLens: boolean;
  /** Raw Next.js searchParam values (`string | string[] | undefined`). */
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<AdminCommerceOrdersIndexPayload> {
  const { operationalLens } = input;
  const sp = input.searchParams;

  const daysRaw =
    typeof sp.days === "string" ? sp.days
    : Array.isArray(sp.days) ? sp.days[0]
    : undefined;
  const pageRaw =
    typeof sp.page === "string" ? sp.page
    : Array.isArray(sp.page) ? sp.page[0]
    : undefined;
  const pageSizeRaw =
    typeof sp.pageSize === "string" ? sp.pageSize
    : Array.isArray(sp.pageSize) ? sp.pageSize[0]
    : undefined;

  const windowDays = clampInt(parseQueryInt(daysRaw, ADMIN_COMMERCE_ORDERS_DEFAULT_WINDOW_DAYS), 1, 366);
  const windowStartsAtUtc = adminCommerceOrdersWindowStartUtc(windowDays);

  const pageSize = clampInt(
    parseQueryInt(pageSizeRaw, ADMIN_COMMERCE_ORDERS_DEFAULT_PAGE_SIZE),
    1,
    ADMIN_COMMERCE_ORDERS_MAX_PAGE_SIZE
  );
  const page = clampInt(parseQueryInt(pageRaw, 1), 1, 10_000);
  const skip = (page - 1) * pageSize;

  const placementWindow: Prisma.CommerceOrderWhereInput = {
    createdAt: { gte: windowStartsAtUtc },
  };

  const adminStrictVisibility: Prisma.CommerceOrderWhereInput =
    operationalLens ?
      placementWindow
    : {
        AND: [
          placementWindow,
          { fulfillmentGroups: { some: {} } },
          { status: { in: [...POST_PAYMENT_ORDER_STATUSES] } },
          { payments: { some: { status: "completed" } } },
        ],
      };

  const [totalMatching, prismaRows] = await Promise.all([
    prisma.commerceOrder.count({ where: adminStrictVisibility }),
    prisma.commerceOrder.findMany({
      where: adminStrictVisibility,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        customer: {
          select: {
            email: true,
            phone: true,
            authMetadata: true,
          },
        },
        fulfillmentGroups: {
          select: { pipeline: true },
          orderBy: { id: "asc" },
        },
      },
    }),
  ]);

  const rows: AdminCommerceOrdersIndexRow[] = prismaRows.map((row) => {
    const pipelines = [...new Set(row.fulfillmentGroups.map((g) => g.pipeline).filter(Boolean))];
    return {
      id: row.id,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      status: row.status,
      clientLabel: customerSummaryFromRow(row),
      fulfillmentGroupCount: row.fulfillmentGroups.length,
      fulfillmentPipelines: pipelines,
    };
  });

  return {
    operationalLens,
    rows,
    pageCount: rows.length,
    totalMatching,
    page,
    pageSize,
    windowDays,
    windowStartsAtUtc,
  };
}
