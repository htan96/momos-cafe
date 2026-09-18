import type { NextRequest } from "next/server";
import type { ImpersonationPayload } from "@/lib/governance/impersonationToken";
import { IMPERSONATION_COOKIE } from "@/lib/governance/impersonationConstants";
import { getImpersonationSecretForVerification } from "@/lib/governance/impersonationSecret";
import { verifyImpersonationToken } from "@/lib/governance/impersonationToken";
import type { CognitoSessionUser } from "@/lib/auth/cognito/types";
import {
  cognitoGroupsForUserRole,
  userRoleToCognitoGroup,
} from "@/lib/auth/userAuthority";
import type { UserRole } from "@prisma/client";
import { effectiveGroupsFromInput } from "@/lib/auth/cognito/roles";

/**
 * HMAC impersonation envelope is verified at impersonation **start** (actor was super_staff).
 * `actorStaffRole` / `actorStaffGroups` let middleware / APIs derive **authority** while the id token reflects the **subject**.
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

function actorRoleFromImpersonation(impersonation: ImpersonationPayload): UserRole | null {
  if (impersonation.actorStaffRole) return impersonation.actorStaffRole;
  const g = impersonation.actorStaffGroups;
  if (Array.isArray(g) && g.includes("super_admin")) return "SuperAdmin";
  if (Array.isArray(g) && g.includes("admin")) return "Admin";
  return null;
}

/** Role checks (middleware gate, API authorize) against JWT + optionally delegated impersonation authority. */
export function delegatedStaffAuthorityGroups(
  jwtUser: CognitoSessionUser | null,
  impersonation: ImpersonationPayload | null | undefined
): readonly string[] {
  const base = jwtUser ? effectiveGroupsFromInput(jwtUser) : [];
  if (!jwtUser) return base;
  if (!impersonation) return effectiveGroupsFromInput(jwtUser);
  if (!jwtUserBindsVerifiedImpersonation(jwtUser, impersonation)) return effectiveGroupsFromInput(jwtUser);

  const actorRole = actorRoleFromImpersonation(impersonation);
  if (actorRole) return cognitoGroupsForUserRole(actorRole);

  const g = impersonation.actorStaffGroups;
  if (Array.isArray(g)) {
    const strings = g.filter((x): x is string => typeof x === "string" && x.length > 0);
    if (strings.length > 0) return strings;
  }
  return effectiveGroupsFromInput(jwtUser);
}

/** DB-aware authority input for `isAdmin` / `isSuperAdmin` with impersonation delegation. */
export function delegatedStaffAuthorityUser(
  jwtUser: CognitoSessionUser | null,
  impersonation: ImpersonationPayload | null | undefined
): CognitoSessionUser | null {
  if (!jwtUser) return null;
  if (!impersonation || !jwtUserBindsVerifiedImpersonation(jwtUser, impersonation)) {
    return jwtUser;
  }
  const actorRole = actorRoleFromImpersonation(impersonation);
  if (!actorRole) return jwtUser;
  return {
    ...jwtUser,
    role: actorRole,
    groups: [...cognitoGroupsForUserRole(actorRole)],
  };
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

  const actorRole = actorRoleFromImpersonation(impersonation);
  const groups = actorRole
    ? [...cognitoGroupsForUserRole(actorRole)]
    : (() => {
        const g = impersonation.actorStaffGroups ?? [];
        return Array.isArray(g)
          ? (g.filter((x): x is string => typeof x === "string" && x.length > 0) as string[])
          : [];
      })();

  return {
    sub: impersonation.actorSub,
    username: impersonation.actorEmail,
    email: impersonation.actorEmail,
    groups: groups.length > 0 ? groups : [...delegatedStaffAuthorityGroups(jwtUser, impersonation)],
    ...(actorRole ? { role: actorRole } : {}),
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

export { userRoleToCognitoGroup };
