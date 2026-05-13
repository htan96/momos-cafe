import type { CognitoGroup } from "@/lib/auth/cognito/types";

export const KNOWN_COGNITO_GROUPS: readonly CognitoGroup[] = [
  "super_admin",
  "admin",
  "employee",
  "customer",
] as const;

export function hasRole(groups: readonly string[] | undefined, role: CognitoGroup): boolean {
  return Boolean(groups?.includes(role));
}

export function isSuperAdmin(groups: readonly string[] | undefined): boolean {
  return hasRole(groups, "super_admin");
}

export function isAdmin(groups: readonly string[] | undefined): boolean {
  return hasRole(groups, "admin") || isSuperAdmin(groups);
}

export function isEmployee(groups: readonly string[] | undefined): boolean {
  return hasRole(groups, "employee") || isAdmin(groups);
}

export function isCustomer(groups: readonly string[] | undefined): boolean {
  return hasRole(groups, "customer");
}

/** True if the user belongs to any of the supplied roles. */
export function hasAnyRole(groups: readonly string[] | undefined, roles: readonly CognitoGroup[]): boolean {
  return roles.some((r) => hasRole(groups, r));
}
