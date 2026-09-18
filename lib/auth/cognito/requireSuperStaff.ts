import { NextResponse } from "next/server";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { readImpersonationFromCookies } from "@/lib/auth/cognito/impersonation";
import {
  delegatedStaffAuthorityGroups,
  delegatedStaffAuthorityUser,
  governanceAuditActorFromDelegation,
} from "@/lib/auth/cognito/staffDelegatedAuthority";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import type { CognitoSessionUser } from "@/lib/auth/cognito/types";
import type { ImpersonationPayload } from "@/lib/governance/impersonationToken";

export type SuperStaffDelegation = {
  jwtUser: CognitoSessionUser | null;
  impersonation: ImpersonationPayload | null;
  authorityGroups: readonly string[];
  authorityUser: CognitoSessionUser | null;
};

export async function resolveSuperStaffDelegation(): Promise<SuperStaffDelegation> {
  const jwtUser = await getCognitoServerSession();
  const impersonation = await readImpersonationFromCookies();
  const authorityUser = delegatedStaffAuthorityUser(jwtUser, impersonation);
  const authorityGroups = delegatedStaffAuthorityGroups(jwtUser, impersonation);
  return { jwtUser, impersonation, authorityGroups, authorityUser };
}

/** Blocks when neither JWT nor delegated impersonation authority is super_admin (Active). */
export async function requireSuperStaffJson(): Promise<NextResponse | null> {
  const { authorityUser, authorityGroups } = await resolveSuperStaffDelegation();
  const check = authorityUser ?? authorityGroups;
  if (!isSuperAdmin(check)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }
  return null;
}

export function governanceAuditActorForSuperStaff(
  ctx: Omit<SuperStaffDelegation, "authorityGroups" | "authorityUser">
): { actorId: string; actorName: string } | null {
  if (!ctx.jwtUser) return null;
  if (!ctx.impersonation) {
    return {
      actorId: ctx.jwtUser.sub,
      actorName: ctx.jwtUser.email ?? ctx.jwtUser.username ?? "",
    };
  }
  return governanceAuditActorFromDelegation({
    jwtUser: ctx.jwtUser,
    impersonation: ctx.impersonation,
  });
}
