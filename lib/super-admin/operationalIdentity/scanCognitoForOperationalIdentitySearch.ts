import type { CognitoEnvConfig } from "@/lib/auth/cognito/config";
import {
  adminGetPoolUser,
  adminListAssignedGroupsForUser,
  adminListUsersPage,
  cognitoQuotedFilterLiteral,
  type ListedPoolUser,
} from "@/lib/auth/cognito/adminPoolDirectory";
import { adminGetUserByEmail } from "@/lib/auth/cognito/adminGetUserByEmail";
import { OPERATIONAL_IDENTITY_COGNITO_SCAN_MAX_USERS } from "./constants";
import type { OperationalPoolUserEnvelope } from "./resolvePoolUserBySub";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_EXACT_RE = /^[^\s@]{1,120}@[^\s@.]{1,120}\.[^\s@]{2,24}$/;

function dbgPayload(evt: string, payload: Record<string, unknown>): void {
  if (process.env.OPERATIONAL_IDENTITY_SEARCH_DEBUG === "true") {
    console.info(JSON.stringify({ evt, ts: Date.now(), ...payload }));
  }
}

function composeHaystack(user: ListedPoolUser): string {
  return [user.username, user.email ?? "", user.preferredUsername ?? "", user.givenName ?? "", user.familyName ?? "", user.name ?? ""]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function matchRank(qLower: string, user: ListedPoolUser): number | null {
  const hs = composeHaystack(user);
  if (!qLower || !hs) return null;

  const mail = user.email?.trim().toLowerCase() ?? "";
  if (mail && mail === qLower) return -1000;

  const ix = hs.indexOf(qLower);
  if (ix >= 0) return ix;

  const tokens = qLower.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return null;

  let sum = 0;
  for (const t of tokens) {
    const p = hs.indexOf(t);
    if (p < 0) return null;
    sum += p;
  }

  return 40 + sum;
}

function trustFilterPseudoRank(scratch: number): number {
  return 200 + (scratch % 59);
}

/**
 * Cognito **`ListUsers`**.Filter helpers (`=` / **`^=`** prefix ladders). Executes via **`ListUsersCommand`**
 * (**`cognito-idp:ListUsers`** SDK export — Cognito exposes no sibling `AdminListUsersCommand` wrapper).
 */
function buildListUsersFilters(queryTrimmed: string, qLower: string): string[] {
  const filters: string[] = [];

  if (UUID_RE.test(queryTrimmed)) {
    filters.push(`sub = ${cognitoQuotedFilterLiteral(queryTrimmed)}`);
    filters.push(`username = ${cognitoQuotedFilterLiteral(queryTrimmed)}`);
  }

  if (EMAIL_EXACT_RE.test(queryTrimmed) && qLower.length <= 254) {
    filters.push(`email = ${cognitoQuotedFilterLiteral(qLower)}`);
  }

  if (queryTrimmed.includes("@")) {
    filters.push(`email ^= ${cognitoQuotedFilterLiteral(qLower)}`);
  }

  if (!queryTrimmed.includes("@")) {
    filters.push(`username ^= ${cognitoQuotedFilterLiteral(qLower)}`);
    filters.push(`preferred_username ^= ${cognitoQuotedFilterLiteral(qLower)}`);
  }

  return [...new Set(filters)];
}

async function hydrateEnvelopes(
  cfg: CognitoEnvConfig,
  shortlisted: ListedPoolUser[]
): Promise<OperationalPoolUserEnvelope[]> {
  return Promise.all(
    shortlisted.map(async (u) => ({
      ...u,
      assignedGroups: await adminListAssignedGroupsForUser(cfg, u.username),
    }))
  );
}

export type CognitoOperationalSearchScanOutcome = {
  envelopes: OperationalPoolUserEnvelope[];
  scannedUsers: number;
  scanCapped: boolean;
  degraded: boolean;
  errorCode?: string;
  errorDetail?: string;
};

/** Bounded Cognito enrichment for **`searchOperationalIdentityCandidates`**. */
export async function scanCognitoForOperationalIdentitySearch(
  cfg: CognitoEnvConfig,
  trimmedQuery: string,
  params: {
    maxEnvelopes: number;
    linkedSubsNormalized: ReadonlySet<string>;
    prismaEmailsLc: ReadonlySet<string>;
  }
): Promise<CognitoOperationalSearchScanOutcome> {
  const queryTrimmed = trimmedQuery.trim();
  const qLower = queryTrimmed.toLowerCase();

  const bestBySub = new Map<
    string,
    {
      user: ListedPoolUser;
      rank: number;
    }
  >();

  let scannedUsers = 0;
  let scanCapped = false;

  let degraded = false;
  let errorCode: string | undefined;
  let errorDetail: string | undefined;

  let filterScratch = 0;

  const suppressed = (u: ListedPoolUser): boolean => {
    const subKey = u.sub.trim();
    if (params.linkedSubsNormalized.has(subKey)) return true;
    const lc = u.email?.trim().toLowerCase() ?? "";
    return Boolean(lc && params.prismaEmailsLc.has(lc));
  };

  const bucketPut = (user: ListedPoolUser, rank: number): void => {
    if (suppressed(user)) return;
    const subKey = user.sub.trim();
    const prev = bestBySub.get(subKey);
    if (!prev || rank < prev.rank) {
      bestBySub.set(subKey, { user, rank });
    }
  };

  dbgPayload("operational_identity_cognito_scan_begin", {
    q: queryTrimmed,
    cap: OPERATIONAL_IDENTITY_COGNITO_SCAN_MAX_USERS,
    maxEnvelopes: params.maxEnvelopes,
  });

  /** Path · UUID-ish pool username conventions. */
  if (UUID_RE.test(queryTrimmed)) {
    const direct = await adminGetPoolUser(cfg, queryTrimmed);
    if (direct) bucketPut(direct, matchRank(qLower, direct) ?? -400);
  }

  /** Path · email-as-Username pools (AdminGet single shot). */
  if (EMAIL_EXACT_RE.test(queryTrimmed) && qLower.length <= 254) {
    try {
      const lu = await adminGetUserByEmail(queryTrimmed);
      if (lu?.sub) {
        const hydrated = await adminGetPoolUser(cfg, lu.username);
        if (hydrated) bucketPut(hydrated, matchRank(qLower, hydrated) ?? -350);
      }
    } catch (ab: unknown) {
      degraded = true;
      dbgPayload("operational_identity_cognito_scan_admin_get_fault", {
        phase: "email_lookup",
        q: queryTrimmed,
        errorCode: typeof ab === "object" && ab && "name" in ab ? String((ab as { name?: string }).name) : null,
        detail: ab instanceof Error ? ab.message : String(ab),
      });
    }
  }

  filterPass: for (const filt of buildListUsersFilters(queryTrimmed, qLower)) {
    try {
      let paginationToken: string | undefined;

      for (;;) {
        if (scannedUsers >= OPERATIONAL_IDENTITY_COGNITO_SCAN_MAX_USERS) {
          scanCapped = true;
          break filterPass;
        }

        const page = await adminListUsersPage(cfg, {
          limit: 60,
          paginationToken,
          filter: filt,
        });

        scannedUsers += page.users.length;
        filterScratch += page.users.length;
        const scratchBase = filterScratch;

        for (let i = 0; i < page.users.length; i += 1) {
          const u = page.users[i]!;
          const haystackHit = matchRank(qLower, u);
          const rankResolved = haystackHit ?? trustFilterPseudoRank(scratchBase + i);
          bucketPut(u, rankResolved);
        }

        paginationToken = page.nextPaginationToken;
        if (!paginationToken) break;
      }
    } catch (fe: unknown) {
      degraded = true;

      dbgPayload("operational_identity_cognito_scan_filter_fault", {
        q: queryTrimmed,
        filter: filt,
        errorCode:
          typeof fe === "object" && fe && "name" in fe ? String((fe as { name?: string }).name) : "COGNITO_FILTER_SCAN_FAILED",
        detail: fe instanceof Error ? fe.message : String(fe),
      });
    }
  }

  try {
    if (scannedUsers < OPERATIONAL_IDENTITY_COGNITO_SCAN_MAX_USERS) {
      let paginationToken: string | undefined;

      for (;;) {
        if (scannedUsers >= OPERATIONAL_IDENTITY_COGNITO_SCAN_MAX_USERS) {
          scanCapped = true;
          break;
        }

        const page = await adminListUsersPage(cfg, {
          limit: 60,
          paginationToken,
          filter: undefined,
        });

        scannedUsers += page.users.length;

        for (const u of page.users) {
          const haystackHit = matchRank(qLower, u);
          if (haystackHit === null) continue;
          bucketPut(u, haystackHit);
        }

        paginationToken = page.nextPaginationToken;
        if (!paginationToken) break;
      }
    } else {
      scanCapped = true;
    }
  } catch (fuzzyFault: unknown) {
    degraded = true;
    errorCode =
      typeof fuzzyFault === "object" && fuzzyFault && "name" in fuzzyFault
        ? String((fuzzyFault as { name?: string }).name)
        : "COGNITO_OPEN_SCAN_FAILED";
    errorDetail = fuzzyFault instanceof Error ? fuzzyFault.message : String(fuzzyFault);

    dbgPayload("operational_identity_cognito_scan_fuzzy_fault", {
      q: queryTrimmed,
      errorCode,
      errorDetail,
    });
  }

  dbgPayload("operational_identity_cognito_scan_end", {
    q: queryTrimmed,
    scannedUsers,
    scanCapped,
    uniqueHits: bestBySub.size,
    degraded,
    errorCode: errorCode ?? null,
  });

  const sorted = [...bestBySub.values()].sort((a, b) => a.rank - b.rank).map((x) => x.user);
  const envelopes = await hydrateEnvelopes(cfg, sorted.slice(0, params.maxEnvelopes));

  return {
    envelopes,
    scannedUsers,
    scanCapped,
    degraded,
    ...(errorCode != null ? { errorCode } : {}),
    ...(errorDetail != null ? { errorDetail } : {}),
  };
}
