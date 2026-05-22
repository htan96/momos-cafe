import type { NextRequest } from "next/server";
import type { ImpersonationPayload } from "@/lib/governance/impersonationToken";
import { IMPERSONATION_COOKIE } from "@/lib/governance/impersonationConstants";
import { getImpersonationSecretForVerification } from "@/lib/governance/impersonationSecret";
import { verifyImpersonationToken } from "@/lib/governance/impersonationToken";
import type { CognitoSessionUser } from "@/lib/auth/cognito/types";

/**
 * HMAC impersonation envelope is verified at impersonation **start** (actor was super_staff).
 * `actorStaffGroups` lets middleware / APIs derive **authority** while the storefront id token reflects the **subject** target.
 */

export async function verifyImpersonationFromNextRequest(
  request: NextRequest
): Promise<ImpersonationPayload | null> {
  const secret = getImpersonationSecretForVerification();
  const raw = request.cookies.get(IMPERSONATION_COOKIE)?.value;
  if (!secret || !raw) return null;
  return verifyImpersonationToken(raw, secret);
}

export function jwtUserBindsVerifiedImpersonation(
  jwtUser: CognitoSessionUser | null | undefined,
  impersonation: ImpersonationPayload | null | undefined
): boolean {
  if (!jwtUser || !impersonation) return false;
  const targetEmail = impersonation.targetEmail.trim().toLowerCase();
  if (jwtUser.sub === impersonation.actorSub) return true;
  if (impersonation.targetSub && jwtUser.sub === impersonation.targetSub) return true;
  const em = jwtUser.email?.trim().toLowerCase();
  if (em && em === targetEmail) return true;
  return false;
}

/** Role checks (middleware gate, API authorize) against JWT + optionally delegated impersonation authority. */
export function delegatedStaffAuthorityGroups(
  jwtUser: CognitoSessionUser | null,
  impersonation: ImpersonationPayload | null | undefined
): readonly string[] {
  const base = jwtUser?.groups ?? [];
  if (!jwtUser) return base;
  if (!impersonation) return jwtUser.groups ?? [];
  if (!jwtUserBindsVerifiedImpersonation(jwtUser, impersonation)) return jwtUser.groups;
  const g = impersonation.actorStaffGroups;
  if (Array.isArray(g)) {
    const strings = g.filter((x): x is string => typeof x === "string" && x.length > 0);
    if (strings.length > 0) return strings;
  }
  return jwtUser.groups;
}

/**
 * When the Cognito JWT is the **impersonated subject**, platform shells still show acting staff identity (`actorSub`).
 */
export function governanceLayoutPrincipalUser(
  jwtUser: CognitoSessionUser,
  impersonation: ImpersonationPayload | null | undefined
): CognitoSessionUser {
  if (!impersonation) return jwtUser;
  const bound = jwtUserBindsVerifiedImpersonation(jwtUser, impersonation);
  if (!bound) return jwtUser;
  if (jwtUser.sub === impersonation.actorSub) return jwtUser;

  const g = impersonation.actorStaffGroups ?? [];
  const groups = Array.isArray(g)
    ? (g.filter((x): x is string => typeof x === "string" && x.length > 0) as string[])
    : [];

  return {
    sub: impersonation.actorSub,
    username: impersonation.actorEmail,
    email: impersonation.actorEmail,
    groups: groups.length > 0 ? groups : [...delegatedStaffAuthorityGroups(jwtUser, impersonation)],
  };
}

/** Governance audits should attribute the staffed actor, even when cookies present the diner JWT. */
export function governanceAuditActorFromDelegation(params: {
  jwtUser: CognitoSessionUser;
  impersonation: ImpersonationPayload | null;
}): { actorId: string; actorName: string } {
  const { jwtUser, impersonation } = params;
  if (impersonation && jwtUserBindsVerifiedImpersonation(jwtUser, impersonation)) {
    const actingAsStaffSession = jwtUser.sub === impersonation.actorSub;
    if (!actingAsStaffSession) {
      return {
        actorId: impersonation.actorSub,
        actorName: impersonation.actorEmail,
      };
    }
  }
  return {
    actorId: jwtUser.sub,
    actorName: jwtUser.email ?? jwtUser.username ?? "",
  };
}
