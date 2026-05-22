import { prisma } from "@/lib/prisma";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import type { CognitoEnvConfig } from "@/lib/auth/cognito/config";
import { adminGetUserByEmail } from "@/lib/auth/cognito/adminGetUserByEmail";
import { adminGetPoolUser, adminListAssignedGroupsForUser } from "@/lib/auth/cognito/adminPoolDirectory";
import type { OperationalPoolUserEnvelope } from "./resolvePoolUserBySub";
import { queryCustomerOperationalTimeline } from "@/lib/accountManagement/queryCustomerOperationalTimeline";
import type {
  OperationalIdentityCandidate,
  OperationalIdentityCounts,
  OperationalIdentityDeepLinks,
  OperationalIdentityLinkage,
} from "./types";
import {
  OPERATIONAL_IDENTITY_NOTIFICATION_COUNT_CAP,
  OPERATIONAL_IDENTITY_SEARCH_LIMIT,
  OPERATIONAL_IDENTITY_SEARCH_MIN_Q,
  OPERATIONAL_IDENTITY_TIMELINE_TAKE,
} from "./constants";
import { resolveOperationalPoolUserBySub } from "./resolvePoolUserBySub";
import { scanCognitoForOperationalIdentitySearch } from "./scanCognitoForOperationalIdentitySearch";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function deepLinks(customerId: string | null): OperationalIdentityDeepLinks {
  return {
    customerDossier: customerId ? `/super-admin/users/customers/${customerId}` : null,
    orderOperationsHref: `/super-admin/order-operations`,
    paymentIntegrityHref: `/super-admin/operations/payment-integrity`,
  };
}

async function loadCounts(customerId: string): Promise<{ counts: OperationalIdentityCounts }> {
  const [orders, payments, shipments, notificationEventsApprox] = await prisma.$transaction([
    prisma.commerceOrder.count({ where: { customerId } }),
    prisma.paymentRecord.count({ where: { order: { customerId } } }),
    prisma.shipment.count({ where: { fulfillmentGroup: { order: { customerId } } } }),
    prisma.notificationEvent.count({
      where: {
        OR: [
          { payload: { path: ["customerId"], equals: customerId } },
          { payload: { path: ["entities", "customerId"], equals: customerId } },
        ],
      },
    }),
  ]);

  let notificationsNote: string | null = null;
  let notifApprox: number | null = notificationEventsApprox;
  if (notificationEventsApprox > OPERATIONAL_IDENTITY_NOTIFICATION_COUNT_CAP) {
    notifApprox = OPERATIONAL_IDENTITY_NOTIFICATION_COUNT_CAP;
    notificationsNote = `Count capped display at ${OPERATIONAL_IDENTITY_NOTIFICATION_COUNT_CAP}+ (actual ${notificationEventsApprox}). Uses JSON paths customerId / entities.customerId — may omit types that stash ids elsewhere.`;
  } else if (notificationEventsApprox > 0) {
    notificationsNote =
      "Approximation: counted rows whose JSON payload exposes `customerId` or `entities.customerId`; notification types that nest ids differently are excluded.";
  }

  return {
    counts: {
      orders,
      payments,
      shipments,
      notificationEventsApprox: notifApprox,
      notificationsNote,
    },
  };
}

async function hydrateCognitoEnvelopeByEmail(
  cfg: CognitoEnvConfig,
  emailRaw: string
): Promise<OperationalPoolUserEnvelope | null> {
  const lu = await adminGetUserByEmail(emailRaw);
  if (!lu) return null;
  const base = await adminGetPoolUser(cfg, lu.username);
  if (!base?.sub) return null;
  const assignedGroups = await adminListAssignedGroupsForUser(cfg, base.username);
  return { ...base, assignedGroups };
}

async function hydrateCognitoForCustomerRecord(customer: {
  id: string;
  email: string | null;
  externalAuthSubject: string | null;
}): Promise<{ cfg: CognitoEnvConfig | null; cognitoEnabled: boolean; poolUser: OperationalPoolUserEnvelope | null }> {
  const cfg = getCognitoConfig();
  if (!cfg) return { cfg: null, cognitoEnabled: false, poolUser: null };

  const sub = customer.externalAuthSubject?.trim() ?? "";
  let poolUser: OperationalPoolUserEnvelope | null = null;

  if (sub) {
    poolUser = await resolveOperationalPoolUserBySub(cfg, sub);
  }

  if (!poolUser) {
    const em = customer.email?.trim();
    if (em) {
      poolUser = await hydrateCognitoEnvelopeByEmail(cfg, em);
      if (poolUser && customer.externalAuthSubject?.trim() && poolUser.sub !== customer.externalAuthSubject.trim()) {
        poolUser = null;
      }
    }
  }

  return { cfg, cognitoEnabled: true, poolUser };
}

function buildCustomerSearchWhere(q: string) {
  const orClause: ({ email: { contains: string; mode: "insensitive" } } | { id: string } | {
    externalAuthSubject: string;
  })[] = [{ email: { contains: q, mode: "insensitive" as const } }];

  if (UUID_RE.test(q)) {
    orClause.push({ id: q });
    orClause.push({ externalAuthSubject: q });
  }

  return { OR: orClause };
}

function dbgOperationalSearch(payload: Record<string, unknown>): void {
  if (process.env.OPERATIONAL_IDENTITY_SEARCH_DEBUG === "true") {
    console.info(JSON.stringify({ evt: "operational_identity_search", ts: Date.now(), ...payload }));
  }
}

export type OperationalIdentitySearchResult = {
  candidates: OperationalIdentityCandidate[];
  cognitoConfigured: boolean;
  cognitoLookup?: {
    degraded: boolean;
    scannedUsers: number;
    scanCapped: boolean;
    errorCode?: string;
    errorDetail?: string;
  };
};

/** Prisma `Customer` probes + pooled **`ListUsers`** scan (**bounded** substring ladder on identities). */
export async function searchOperationalIdentityCandidates(trimmedQuery: string): Promise<OperationalIdentitySearchResult> {
  const cfg = getCognitoConfig();
  const cognitoConfigured = Boolean(cfg);
  const q = trimmedQuery.trim();

  const emptyOutcome = (): OperationalIdentitySearchResult => ({
    candidates: [],
    cognitoConfigured,
  });

  if (q.length < OPERATIONAL_IDENTITY_SEARCH_MIN_Q) return emptyOutcome();

  const limit = OPERATIONAL_IDENTITY_SEARCH_LIMIT;

  const custRows = await prisma.customer.findMany({
    where: buildCustomerSearchWhere(q),
    take: limit,
    select: {
      id: true,
      email: true,
      phone: true,
      externalAuthSubject: true,
    },
  });

  const linkedSubsNormalize = new Set<string>();
  for (const row of custRows) {
    const s = row.externalAuthSubject?.trim();
    if (s) linkedSubsNormalize.add(s);
  }

  const prismaEmailsLc = new Set<string>();
  for (const row of custRows) {
    const em = row.email?.trim().toLowerCase();
    if (em) prismaEmailsLc.add(em);
  }

  const prismaCandidates: OperationalIdentityCandidate[] = [];

  for (const c of custRows) {
    const h = await hydrateCognitoForCustomerRecord(c);
    const poolUser = h.poolUser;
    const emailMerged = poolUser?.email ?? c.email ?? null;

    const linkageResolved: OperationalIdentityLinkage = poolUser?.sub?.trim()
      ? "linked_customer"
      : "customer_no_pool_link";

    const resolvedPoolSub = poolUser?.sub?.trim();
    if (resolvedPoolSub) linkedSubsNormalize.add(resolvedPoolSub);
    const emLcMerged = emailMerged?.trim().toLowerCase();
    if (emLcMerged) prismaEmailsLc.add(emLcMerged);

    const groupsSorted = poolUser ? [...poolUser.assignedGroups].sort((a, b) => a.localeCompare(b)) : [];

    prismaCandidates.push({
      cognitoConfigured,
      kind: "customer",
      linkage: linkageResolved,
      id: c.id,
      email: emailMerged,
      cognitoSub: poolUser?.sub ?? c.externalAuthSubject,
      cognitoUsername: poolUser?.username ?? null,
      preferredUsername: poolUser?.preferredUsername ?? null,
      enabled: poolUser?.enabled ?? null,
      groups: groupsSorted,
      phone: c.phone ?? null,
      subtitle:
        linkageResolved === "linked_customer"
          ? "Prisma matched · pooled profile resolved."
          : "Prisma matched · no Cognito directory hit for hydrate path.",
    });
  }

  let cognitoLookup: OperationalIdentitySearchResult["cognitoLookup"];
  let poolOnly: OperationalIdentityCandidate[] = [];

  const poolVacancy = Math.max(0, limit - prismaCandidates.length);

  if (cfg && poolVacancy > 0) {
    const scanOutcome = await scanCognitoForOperationalIdentitySearch(cfg, q, {
      maxEnvelopes: poolVacancy,
      linkedSubsNormalized: linkedSubsNormalize,
      prismaEmailsLc,
    });

    cognitoLookup = {
      degraded: scanOutcome.degraded,
      scannedUsers: scanOutcome.scannedUsers,
      scanCapped: scanOutcome.scanCapped,
      ...(scanOutcome.errorCode ? { errorCode: scanOutcome.errorCode } : {}),
      ...(scanOutcome.errorDetail ? { errorDetail: scanOutcome.errorDetail } : {}),
    };

    for (const envelope of scanOutcome.envelopes) {
      const subKey = envelope.sub.trim();
      if (linkedSubsNormalize.has(subKey)) continue;
      const mailLc = envelope.email?.trim().toLowerCase() ?? "";
      if (mailLc && prismaEmailsLc.has(mailLc)) continue;

      poolOnly.push({
        cognitoConfigured: true,
        kind: "cognito_profile",
        linkage: "cognito_only",
        id: envelope.sub,
        email: envelope.email ?? null,
        cognitoSub: envelope.sub,
        cognitoUsername: envelope.username,
        preferredUsername: envelope.preferredUsername,
        enabled: envelope.enabled,
        groups: [...envelope.assignedGroups].sort((a, b) => a.localeCompare(b)),
        phone: null,
        subtitle: "Cognito-only (no prisma Customer surfaced for this match).",
      });
    }
  }

  const combined = prismaCandidates.concat(poolOnly);

  dbgOperationalSearch({
    query: q,
    prismaHits: prismaCandidates.length,
    poolExtras: poolOnly.length,
    cognitoConfigured,
    cognitoLookup: cognitoLookup ?? null,
    combinedReturned: combined.length,
  });

  return {
    cognitoConfigured,
    ...(cognitoLookup ? { cognitoLookup } : {}),
    candidates: combined,
  };
}

export type OperationalIdentityCustomerJson = {
  id: string;
  email: string | null;
  phone: string | null;
  externalAuthSubject: string | null;
  createdAt: string | null;
};

export type OperationalIdentityBundleSerialized = {
  queryKey: string;
  cognitoConfigured: boolean;
  customer: OperationalIdentityCustomerJson | null;
  identity: null | {
    cognitoUsername: string;
    cognitoSub: string;
    email: string | null;
    displayName: string | null;
    enabled: boolean | null;
    assignedGroups: string[];
  };
  counts: OperationalIdentityCounts | null;
  deepLinks: OperationalIdentityDeepLinks;
  timeline: Array<{
    id: string;
    kind: "operational_activity" | "governance_audit";
    at: string;
    lane: string;
    severity: string;
    headline: string;
    detail: string | null;
    rawType: string | null;
    source?: string | null;
  }>;
  timelinePartial: boolean;
};

/**
 * Loads the operational identity dossier keyed by **`Customer.id`**, **`Customer.external_auth_subject`** (pool sub),
 * or a lone Cognito **sub** (staff profiles without diner row).
 *
 * Ordering for UUID-shaped keys: prisma **`customers.id`** is tried first — then **`external_auth_subject`**.
 */
export async function resolveOperationalIdentityBundle(routeKeyRaw: string): Promise<OperationalIdentityBundleSerialized | null> {
  const routeKey = routeKeyRaw.trim();
  if (!routeKey || routeKey.length > 220) return null;

  let customerRow = UUID_RE.test(routeKey)
    ? await prisma.customer.findUnique({
        where: { id: routeKey },
        select: { id: true, email: true, phone: true, externalAuthSubject: true, createdAt: true },
      })
    : null;

  if (!customerRow) {
    customerRow = await prisma.customer.findFirst({
      where: { externalAuthSubject: routeKey },
      select: { id: true, email: true, phone: true, externalAuthSubject: true, createdAt: true },
    });
  }

  const cfg = getCognitoConfig();
  let poolUserMerged: OperationalIdentityBundleSerialized["identity"] = null;

  let poolEnvelope: OperationalPoolUserEnvelope | null = null;

  if (customerRow) {
    const h = await hydrateCognitoForCustomerRecord(customerRow);
    poolEnvelope = h.poolUser;
  } else if (cfg) {
    poolEnvelope = await resolveOperationalPoolUserBySub(cfg, routeKey);
  }

  if (poolEnvelope) {
    poolUserMerged = {
      cognitoUsername: poolEnvelope.username,
      cognitoSub: poolEnvelope.sub,
      email: poolEnvelope.email,
      displayName: poolEnvelope.name,
      enabled: poolEnvelope.enabled,
      assignedGroups: poolEnvelope.assignedGroups,
    };
  }

  const deepLinksResolved = deepLinks(customerRow?.id ?? null);

  if (!customerRow && !poolUserMerged) return null;

  let countsPack: OperationalIdentityCounts | null = null;
  if (customerRow) {
    const { counts } = await loadCounts(customerRow.id);
    countsPack = counts;
  }

  let timelineMerged: OperationalIdentityBundleSerialized["timeline"] = [];
  let timelinePartial = false;

  if (customerRow && poolUserMerged) {
    try {
      const tl = await queryCustomerOperationalTimeline({
        customer: {
          id: customerRow.id,
          email: customerRow.email ?? null,
          externalAuthSubject: poolUserMerged.cognitoSub,
        },
        operationalTake: OPERATIONAL_IDENTITY_TIMELINE_TAKE,
        governanceTake: 12,
      });
      timelineMerged = tl.map((row) => ({
        id: row.id,
        kind: row.kind,
        at: row.at.toISOString(),
        lane: row.lane,
        severity: String(row.severity),
        headline: row.headline,
        detail: row.detail ?? null,
        rawType: row.rawType ?? null,
        ...(row.source != null ? { source: row.source } : {}),
      }));
      timelinePartial = tl.length >= OPERATIONAL_IDENTITY_TIMELINE_TAKE;
    } catch {
      timelinePartial = true;
    }
  }

  const customerSerialized: OperationalIdentityCustomerJson | null = customerRow
    ? {
        id: customerRow.id,
        email: customerRow.email,
        phone: customerRow.phone,
        externalAuthSubject: customerRow.externalAuthSubject,
        createdAt: customerRow.createdAt.toISOString(),
      }
    : null;

  const queryResolvedKey = customerRow?.id ?? poolUserMerged?.cognitoSub ?? routeKey;

  return {
    queryKey: queryResolvedKey,
    cognitoConfigured: Boolean(cfg),
    customer: customerSerialized,
    identity: poolUserMerged,
    counts: countsPack,
    deepLinks: deepLinksResolved,
    timeline: timelineMerged,
    timelinePartial,
  };
}
