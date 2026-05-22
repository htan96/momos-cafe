import { adminGetUserByEmail } from "@/lib/auth/cognito/adminGetUserByEmail";
import type { CognitoEnvConfig } from "@/lib/auth/cognito/config";
import { adminGetPoolUser, adminListAssignedGroupsForUser, type ListedPoolUser } from "@/lib/auth/cognito/adminPoolDirectory";

export type OperationalPoolUserEnvelope = ListedPoolUser & {
  assignedGroups: string[];
};

/**
 * Resolves an IdP profile for `sub`:
 * - Tries **`AdminGetUser(Username=sub)`** (covers pools where **`Username`** is the UUID sub).
 * - Falls back through **`Customer.externalAuthSubject`** → email-based lookup when present.
 *
 * Pools that use **`email`** as Cognito **`Username`** require a **`Customer`** row linking **`sub`**.
 */
export async function resolveOperationalPoolUserBySub(
  cfg: CognitoEnvConfig,
  cognitoSub: string
): Promise<OperationalPoolUserEnvelope | null> {
  const sub = cognitoSub.trim();
  if (!sub) return null;

  let poolUser =
    (await adminGetPoolUser(cfg, sub)) ??
    /** Some pools expose email as Cognito Username — hydrate `ListedPoolUser` via email helper when possible. */
    null;

  if (!poolUser) {
    try {
      const { prisma } = await import("@/lib/prisma");
      const cust = await prisma.customer.findFirst({
        where: { externalAuthSubject: sub },
        select: { email: true },
      });
      const em = cust?.email?.trim();
      if (em) {
        const lu = await adminGetUserByEmail(em);
        if (lu) {
          const hydrated = await adminGetPoolUser(cfg, lu.username);
          if (hydrated?.sub === sub) poolUser = hydrated;
        }
      }
    } catch {
      /* Best-effort local mirror — prisma errors should not cascade to callers. */
    }
  }

  if (!poolUser) return null;

  const assignedGroups = await adminListAssignedGroupsForUser(cfg, poolUser.username);

  return { ...poolUser, assignedGroups };
}
