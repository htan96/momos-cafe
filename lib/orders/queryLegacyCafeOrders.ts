import { Prisma, type CafeOrder } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OPS_ENTITY_UUID_RE } from "@/lib/operations/operationalContextLinks";

const DEFAULT_TAKE = 40;
const MAX_TAKE = 100;

function sanitizeLikeSegment(raw: string): string {
  return raw.trim().replace(/[%_\\]/g, "");
}

async function cafeOrderSlice(params: {
  where: Prisma.CafeOrderWhereInput;
  skip: number;
  take: number;
}): Promise<{ rows: CafeOrder[]; total: number }> {
  const [slice, total] = await prisma.$transaction([
    prisma.cafeOrder.findMany({
      where: params.where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take + 1,
    }),
    prisma.cafeOrder.count({ where: params.where }),
  ]);
  const hasMore = slice.length > params.take;
  return {
    rows: hasMore ? slice.slice(0, params.take) : slice,
    total,
  };
}

/** Super-admin list for `cafe_orders` — search by UUID or nested customer email in JSON (`customer.email`). */
export async function queryLegacyCafeOrders(params: {
  search?: string | null;
  status?: string | null;
  /** 1-based */
  page: number;
  take?: number;
}): Promise<{ rows: CafeOrder[]; total: number; take: number; page: number }> {
  const take = Math.min(
    MAX_TAKE,
    Math.max(
      1,
      typeof params.take === "number" && Number.isFinite(params.take) ?
        Math.floor(params.take)
      : DEFAULT_TAKE
    )
  );
  const page =
    typeof params.page === "number" && Number.isFinite(params.page) ?
      Math.max(1, Math.floor(params.page))
    : 1;
  const skip = (page - 1) * take;

  const search = typeof params.search === "string" ? params.search.trim() : "";
  const statusRaw = typeof params.status === "string" ? params.status.trim() : "";
  const statusWhere: Prisma.CafeOrderWhereInput | undefined =
    statusRaw.length ? { status: statusRaw } : undefined;

  if (OPS_ENTITY_UUID_RE.test(search)) {
    const row = await prisma.cafeOrder.findUnique({ where: { id: search } });
    const rows = row ? [row] : [];
    return { rows, total: rows.length, take, page: 1 };
  }

  if (!search.length) {
    const { rows, total } = await cafeOrderSlice({
      where: statusWhere ?? {},
      skip,
      take,
    });
    return { rows, total, take, page };
  }

  const likeSeg = sanitizeLikeSegment(search);
  if (!likeSeg.length) {
    const { rows, total } = await cafeOrderSlice({
      where: statusWhere ?? {},
      skip,
      take,
    });
    return { rows, total, take, page };
  }

  const emailPattern = `%${likeSeg.toLowerCase()}%`;
  const notesPattern = `%${likeSeg}%`;
  const statusSql =
    statusRaw.length ?
      Prisma.sql`AND co.status = ${statusRaw}`
    : Prisma.sql``;

  type IdRow = { id: string };
  const ids = await prisma.$queryRaw<IdRow[]>`
    SELECT co.id::text AS id
    FROM cafe_orders co
    WHERE 1 = 1
    ${statusSql}
      AND (
        LOWER(co.customer->>'email') LIKE ${emailPattern}
        OR LOWER(co.notes) LIKE LOWER(${notesPattern})
      )
    ORDER BY co.created_at DESC
    OFFSET ${skip}
    FETCH NEXT ${take + 1} ROWS ONLY
  `;

  type CountRow = { c: bigint };
  const counted = await prisma.$queryRaw<CountRow[]>`
    SELECT COUNT(*)::bigint AS c
    FROM cafe_orders co
    WHERE 1 = 1
    ${statusSql}
      AND (
        LOWER(co.customer->>'email') LIKE ${emailPattern}
        OR LOWER(co.notes) LIKE LOWER(${notesPattern})
      )
  `;

  const matchTotal =
    counted[0]?.c !== undefined ?
      typeof counted[0].c === "bigint"
      ? Number(counted[0].c)
      : Number(counted[0].c)
    : 0;

  const hasMore = ids.length > take;
  const pageIds = (hasMore ? ids.slice(0, take) : ids).map((r) => r.id);
  if (!pageIds.length) {
    return { rows: [], total: matchTotal, take, page };
  }

  const rowsOrdered = await prisma.cafeOrder.findMany({
    where: { id: { in: pageIds } },
  });
  const orderMap = new Map(rowsOrdered.map((r) => [r.id, r]));
  const rows = pageIds.map((id) => orderMap.get(id)).filter(Boolean) as CafeOrder[];

  return {
    rows,
    total: matchTotal,
    take,
    page,
  };
}
