import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  GOVERNANCE_CONTROL_DEFINITIONS,
  GOVERNANCE_CONTROL_KEYS,
  type GovernanceControlKey,
} from "@/lib/governance/controlKeys";

export const GOVERNANCE_CONTROLS_CACHE_TAG = "governance-controls";

export type GovernanceHttpCode =
  | "CHECKOUT_DISABLED"
  | "ORDERING_DISABLED"
  | "STOREFRONT_READ_ONLY"
  | "REGISTRATIONS_DISABLED";

/** 403 JSON `{ code }` — matches maintenance-style compact errors. */
export function governanceJsonResponse(code: GovernanceHttpCode): NextResponse {
  return NextResponse.json({ code }, { status: 403 });
}

/**
 * Ensures every known control row exists with metadata. Safe to call on deploys.
 * Restriction defaults are off (`enabled: false`) except where definition.defaultEnabled is true.
 */
export async function ensureGovernanceControls(): Promise<void> {
  await prisma.$transaction(
    GOVERNANCE_CONTROL_KEYS.map((key) => {
      const def = GOVERNANCE_CONTROL_DEFINITIONS[key];
      return prisma.platformGovernanceControl.upsert({
        where: { key },
        create: {
          key,
          category: def.category,
          enabled: def.defaultEnabled,
          description: def.description,
          lastModifiedBy: null,
          metadata: { title: def.title } as object,
        },
        update: {
          category: def.category,
          description: def.description,
          metadata: { title: def.title } as object,
          // Do not overwrite `enabled` — operator state is authoritative
        },
      });
    })
  );
}

type GovernanceRow = {
  key: GovernanceControlKey;
  category: string;
  enabled: boolean;
  description: string | null;
  lastModifiedBy: string | null;
  updatedAt: Date;
  value: unknown | null;
  metadata: unknown | null;
};

export async function loadGovernanceControlRowsUncached(): Promise<GovernanceRow[]> {
  await ensureGovernanceControls();
  const rows = await prisma.platformGovernanceControl.findMany({
    where: { key: { in: [...GOVERNANCE_CONTROL_KEYS] } },
    orderBy: { key: "asc" },
  });
  return rows as GovernanceRow[];
}

export const getGovernanceControls = unstable_cache(loadGovernanceControlRowsUncached, ["governance-controls-v1"], {
  revalidate: 45,
  tags: [GOVERNANCE_CONTROLS_CACHE_TAG],
});

export async function getGovernanceControlMap(): Promise<Record<GovernanceControlKey, boolean>> {
  const rows = await getGovernanceControls();
  const map = {} as Record<GovernanceControlKey, boolean>;
  for (const k of GOVERNANCE_CONTROL_KEYS) {
    map[k] = false;
  }
  for (const r of rows) {
    if (GOVERNANCE_CONTROL_KEYS.includes(r.key as GovernanceControlKey)) {
      map[r.key as GovernanceControlKey] = r.enabled;
    }
  }
  return map;
}

/**
 * `true` when the restriction named by `key` is active (`PlatformGovernanceControl.enabled`).
 * For `checkout_disabled`, `true` means checkout is turned off.
 */
export async function isControlEnabled(key: GovernanceControlKey): Promise<boolean> {
  const map = await getGovernanceControlMap();
  return map[key];
}

/** Cart + draft order mutations (not checkout-only). */
export async function governanceBlockStorefrontMutations(): Promise<NextResponse | null> {
  const map = await getGovernanceControlMap();
  if (map.ordering_disabled) {
    return governanceJsonResponse("ORDERING_DISABLED");
  }
  if (map.storefront_read_only) {
    return governanceJsonResponse("STOREFRONT_READ_ONLY");
  }
  return null;
}

/** Payment + checkout orchestration routes. */
export async function governanceBlockCheckout(): Promise<NextResponse | null> {
  const map = await getGovernanceControlMap();
  if (map.checkout_disabled) {
    return governanceJsonResponse("CHECKOUT_DISABLED");
  }
  return null;
}

/**
 * Unified guard for POST /api/orders and legacy checkout: checkout first, then cart/order mutations.
 */
export async function governanceBlockUnifiedOrderPath(): Promise<NextResponse | null> {
  const checkout = await governanceBlockCheckout();
  if (checkout) return checkout;
  return governanceBlockStorefrontMutations();
}

/**
 * Throws a plain Error with message `GOVERNANCE:<code>` if commerce writes are blocked.
 * Route handlers may catch and map to JSON; prefer `governanceBlock*` helpers for API routes.
 */
export async function requireCommerceWritesAllowed(): Promise<void> {
  const map = await getGovernanceControlMap();
  if (map.ordering_disabled) {
    throw new Error("GOVERNANCE:ORDERING_DISABLED");
  }
  if (map.storefront_read_only) {
    throw new Error("GOVERNANCE:STOREFRONT_READ_ONLY");
  }
}
