import { hasRole, isCustomer, isSuperAdmin, KNOWN_COGNITO_GROUPS } from "@/lib/auth/cognito/roles";
import type { CognitoSessionUser } from "@/lib/auth/cognito/types";
import type { ImpersonationPayload } from "@/lib/governance/impersonationToken";

function primaryGroup(groups: readonly string[]): string | null {
  for (const g of KNOWN_COGNITO_GROUPS) {
    if (groups.includes(g)) return g;
  }
  const first = groups[0];
  return typeof first === "string" ? first : null;
}

export function derivePresenceUserType(
  input: Parameters<typeof isSuperAdmin>[0]
): "customer" | "admin" | "super_admin" {
  if (isSuperAdmin(input)) return "super_admin";
  if (hasRole(input, "admin")) return "admin";
  if (isCustomer(input)) return "customer";
  return "customer";
}

export function buildPresenceSessionFields(args: {
  user: CognitoSessionUser;
  impersonation: ImpersonationPayload | null;
}): {
  userType: "customer" | "admin" | "super_admin";
  userRole: string | null;
  displayName: string | null;
  isImpersonated: boolean;
  impersonatorSub: string | null;
} {
  const { user, impersonation } = args;
  const userType = derivePresenceUserType(user);
  const userRole = user.role ?? primaryGroup(user.groups ?? []);
  let displayName: string | null = user.email?.split("@")[0]?.trim() || user.username || null;

  let isImpersonated = false;
  let impersonatorSub: string | null = null;

  if (impersonation) {
    isImpersonated = true;
    impersonatorSub = impersonation.actorSub;
    const targetPrefix = impersonation.targetEmail.split("@")[0]?.trim();
    if (targetPrefix) displayName = targetPrefix;
  }

  return { userType, userRole, displayName, isImpersonated, impersonatorSub };
}
