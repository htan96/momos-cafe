import type { ListedPoolUser } from "@/lib/auth/cognito/adminPoolDirectory";
import { adminListUsersInPoolGroup } from "@/lib/auth/cognito/adminPoolDirectory";
import type { CognitoEnvConfig } from "@/lib/auth/cognito/config";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AccountMgmtRole = "customer" | "admin" | "super_admin";

export type AccountMgmtRowKind = "customer" | "staff";

export type AccountMgmtListParams = {
  q?: string;
  customersOnly?: boolean;
  adminsOnly?: boolean;
  recentSignup?: boolean;
  activeUsers?: boolean;
  failedPayments?: boolean;
  customerTake?: number;
};

export type AccountMgmtSummaryRow = {
  kind: AccountMgmtRowKind;
  /** Customer Postgres id (UUID), or Cognito Username for operators. */
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: AccountMgmtRole;
  signupAtIso: string | null;
  lastActiveAtIso: string | null;
  orderCount: number;
  activeSession: boolean;
  linkedCustomerRowId?: string | null;
  cognitoSub?: string | null;
};

export function displayNameFromAuth(meta: unknown): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const am = meta as Record<string, unknown>;
  for (const key of ["fullName", "name", "displayName"] as const) {
    const v = am[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

const RECENT_SIGNUP_MS = 14 * 24 * 60 * 60 * 1000;
const ACTIVE_USER_MS = 15 * 60 * 1000;

function normalizeQuery(q: string | undefined): string {
  return (q ?? "").trim().toLowerCase();
}

function rank(role: AccountMgmtRole): number {
  switch (role) {
    case "customer":
      return 0;
    case "admin":
      return 1;
    case "super_admin":
      return 2;
    default:
      return 0;
  }
}

type StaffWithRole = ListedPoolUser & { staffRole: AccountMgmtRole };

async function loadStaffBundles(cfg: CognitoEnvConfig): Promise<{
  bySub: Map<string, StaffWithRole>;
  byEmailNorm: Map<string, string>; // normalized email → cognitoSub
}> {
  const [adminsRaw, supersRaw] = await Promise.all([
    adminListUsersInPoolGroup(cfg, "admin"),
    adminListUsersInPoolGroup(cfg, "super_admin"),
  ]);
  const superSubs = new Set(supersRaw.map((u) => u.sub));
  const bySub = new Map<string, StaffWithRole>();

  for (const u of adminsRaw) {
    bySub.set(u.sub, { ...u, staffRole: superSubs.has(u.sub) ? "super_admin" : "admin" });
  }
  for (const u of supersRaw) {
    const prev = bySub.get(u.sub);
    bySub.set(u.sub, { ...(prev ?? u), ...u, staffRole: "super_admin" });
  }

  const byEmailNorm = new Map<string, string>();
  for (const r of bySub.values()) {
    const em = r.email?.trim().toLowerCase();
    if (em) byEmailNorm.set(em, r.sub);
  }
  return { bySub, byEmailNorm };
}

async function fetchRecentPresenceMap(subs: string[], windowMs: number): Promise<Map<string, Date>> {
  if (subs.length === 0) return new Map();
  const cutoff = new Date(Date.now() - windowMs);
  const hits = await prisma.platformPresenceSession.findMany({
    where: {
      cognitoSub: { in: subs },
      terminatedAt: null,
      lastActivityAt: { gte: cutoff },
      isActive: true,
    },
    select: { cognitoSub: true, lastActivityAt: true },
    orderBy: { lastActivityAt: "desc" },
  });
  const out = new Map<string, Date>();
  for (const h of hits) {
    const s = h.cognitoSub?.trim();
    if (!s || out.has(s)) continue;
    out.set(s, h.lastActivityAt);
  }
  return out;
}

function subsWithActivePresence(subs: string[], presence: Map<string, Date>): Set<string> {
  const cutoff = Date.now() - ACTIVE_USER_MS;
  const hit = new Set<string>();
  for (const sub of subs) {
    const t = presence.get(sub);
    if (t && t.getTime() >= cutoff) hit.add(sub);
  }
  return hit;
}

export async function buildAccountMgmtList(
  cfg: CognitoEnvConfig | null,
  params: AccountMgmtListParams
): Promise<{ rows: AccountMgmtSummaryRow[]; cognitoUnavailable: boolean }> {
  const customerTake = params.customerTake ?? 120;
  const cognitoUnavailable = cfg === null;
  let staffMap: Map<string, StaffWithRole> = new Map();
  let staffByEmailNorm = new Map<string, string>();
  let cognitoListingFailed = false;
  try {
    if (cfg && !params.customersOnly) {
      const b = await loadStaffBundles(cfg);
      staffMap = b.bySub;
      staffByEmailNorm = b.byEmailNorm;
    }
  } catch {
    if (cfg) cognitoListingFailed = true;
  }

  const qNorm = normalizeQuery(params.q);
  const cutoffRecent = new Date(Date.now() - RECENT_SIGNUP_MS);
  const presenceWindowStart = new Date(Date.now() - ACTIVE_USER_MS);

  const customerAnd: Prisma.CustomerWhereInput[] = [];

  if (qNorm) {
    customerAnd.push({
      OR: [
        { email: { contains: qNorm, mode: "insensitive" } },
        { phone: { contains: qNorm, mode: "insensitive" } },
        { externalAuthSubject: { contains: qNorm, mode: "insensitive" } },
      ],
    });
  }
  if (params.failedPayments) {
    customerAnd.push({
      OR: [
        {
          orders: {
            some: {
              payments: { some: { status: "failed" } },
            },
          },
        },
        {
          orders: { some: { status: "payment_failed" } },
        },
      ],
    });
  }
  if (params.recentSignup) {
    customerAnd.push({ createdAt: { gte: cutoffRecent } });
  }
  if (params.activeUsers) {
    const activeSubsRows = await prisma.platformPresenceSession.findMany({
      where: {
        cognitoSub: { not: null },
        terminatedAt: null,
        isActive: true,
        lastActivityAt: { gte: presenceWindowStart },
      },
      distinct: ["cognitoSub"],
      select: { cognitoSub: true },
    });
    const subList = activeSubsRows
      .map((r) => r.cognitoSub?.trim())
      .filter((x): x is string => Boolean(x));

    /** When no subs match activity, constrain to impossible id so list is empty (not everyone). */
    customerAnd.push({
      externalAuthSubject: subList.length > 0 ? { in: subList } : { equals: "__no_active_sessions__" },
    });
  }

  const customerWhere: Prisma.CustomerWhereInput =
    customerAnd.length === 1 ? customerAnd[0]! : { AND: customerAnd };

  const customers =
    params.adminsOnly ?
      []
    : await prisma.customer.findMany({
        where: customerWhere,
        take: customerTake,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          email: true,
          phone: true,
          authMetadata: true,
          externalAuthSubject: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { orders: true } },
        },
      });

  const customersByNormEmail = new Map<string, (typeof customers)[number]>();
  for (const c of customers) {
    const mn = c.email?.trim().toLowerCase();
    if (mn) customersByNormEmail.set(mn, c);
  }

  const customerRowsExcludedStaff = params.adminsOnly
    ? []
    : customers.filter((c) => {
        const mail = c.email?.trim().toLowerCase();
        return !(mail && staffByEmailNorm.has(mail));
      });

  /** Build lookup for staff order counts linked by email */
  const ordersByCustomerId = new Map<string, number>();
  for (const c of customers) ordersByCustomerId.set(c.id, c._count.orders);

  /** Staff summaries */
  const staffRowsAll: AccountMgmtSummaryRow[] = [];
  if (!params.customersOnly && staffMap.size > 0) {
    for (const blob of staffMap.values()) {
      const mailNorm = blob.email?.trim().toLowerCase() ?? "";

      let include = true;
      if (qNorm) {
        const hay =
          `${blob.username} ${blob.email ?? ""} ${blob.name ?? ""} ${blob.sub}`.toLowerCase();
        include = hay.includes(qNorm);
      }
      if (params.recentSignup) {
        if (!blob.userCreateDate || blob.userCreateDate < cutoffRecent) include = false;
      }

      if (!include) continue;

      const linkedCust = mailNorm ? customersByNormEmail.get(mailNorm) : undefined;
      const linkedId = linkedCust?.id;

      staffRowsAll.push({
        kind: "staff",
        id: blob.username,
        name: blob.name,
        email: blob.email,
        phone: null,
        role: blob.staffRole,
        signupAtIso: blob.userCreateDate ? blob.userCreateDate.toISOString() : null,
        lastActiveAtIso: null,
        orderCount: linkedId ? (ordersByCustomerId.get(linkedId) ?? 0) : 0,
        activeSession: false,
        cognitoSub: blob.sub,
        linkedCustomerRowId: linkedId ?? null,
      });
    }
  }

  /** Presence for customers + remaining staff subs */
  const customerSubsForPresence = customerRowsExcludedStaff.map((c) => c.externalAuthSubject?.trim()).filter(Boolean) as string[];
  const staffSubsForPresence =
    params.customersOnly || staffRowsAll.length === 0 ? [] : staffRowsAll.map((s) => s.cognitoSub).filter(Boolean) as string[];

  const allSubs = [...new Set([...customerSubsForPresence, ...staffSubsForPresence])];
  /** Use a modest lookback window for listing “recent active” timestamps (24h display), “active badge” stays 15min */
  const presenceWindowForDisplay = Math.max(ACTIVE_USER_MS, 24 * 60 * 60 * 1000);
  const presenceMap = await fetchRecentPresenceMap(allSubs, presenceWindowForDisplay);
  const activeBadgeSubs = subsWithActivePresence(allSubs, presenceMap);

  const staffRows =
    params.activeUsers ?
      staffRowsAll.filter((r) => r.cognitoSub && activeBadgeSubs.has(r.cognitoSub))
    : staffRowsAll;

  const customerSummaries: AccountMgmtSummaryRow[] = [];
  const customerSummariesAll: AccountMgmtSummaryRow[] = [];

  if (!params.adminsOnly) {
    const customersForListing = customerRowsExcludedStaff;
    /**
     * If active-users filter applies, Postgres customer query already restricts by external_subject in active list.
     */
    const seen = customersForListing;
    for (const c of seen) {
      const sub = c.externalAuthSubject?.trim() ?? "";
      const lastSeen = sub ? presenceMap.get(sub) : undefined;
      const summary: AccountMgmtSummaryRow = {
        kind: "customer",
        id: c.id,
        name: displayNameFromAuth(c.authMetadata),
        email: c.email,
        phone: c.phone,
        role: "customer",
        signupAtIso: c.createdAt.toISOString(),
        lastActiveAtIso: lastSeen?.toISOString() ?? null,
        orderCount: c._count.orders,
        activeSession: sub ? activeBadgeSubs.has(sub) : false,
        cognitoSub: sub || null,
      };
      customerSummariesAll.push(summary);
      if (params.activeUsers && !(sub && activeBadgeSubs.has(sub))) continue;
      customerSummaries.push(summary);
    }
  }

  for (const s of staffRows) {
    if (s.cognitoSub) {
      const t = presenceMap.get(s.cognitoSub);
      s.lastActiveAtIso = t?.toISOString() ?? null;
      s.activeSession = activeBadgeSubs.has(s.cognitoSub);
    }
  }

  const merged =
    params.customersOnly ?
      [...(params.activeUsers ? customerSummaries : customerSummariesAll)]
    : params.adminsOnly ?
      [...staffRows]
    : [...staffRows, ...(params.activeUsers ? customerSummaries : customerSummariesAll)];

  merged.sort((a, b) => {
    const rDelta = rank(b.role) - rank(a.role);
    if (rDelta !== 0) return rDelta;
    const aT = new Date(a.lastActiveAtIso ?? a.signupAtIso ?? 0).getTime();
    const bT = new Date(b.lastActiveAtIso ?? b.signupAtIso ?? 0).getTime();
    return bT - aT;
  });

  /** When active-users + customersOnly, prisma filter excluded customers lacking external_subject in active list —
   *  still safe to return empty */
  return {
    rows: merged,
    cognitoUnavailable:
      cognitoUnavailable || cognitoListingFailed,
  };
}
