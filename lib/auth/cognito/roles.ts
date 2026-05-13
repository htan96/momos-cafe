import type { CognitoGroup } from "@/lib/auth/cognito/types";

export const KNOWN_COGNITO_GROUPS: readonly CognitoGroup[] = [
  "super_admin",
  "admin",
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

export function isCustomer(groups: readonly string[] | undefined): boolean {
  return hasRole(groups, "customer");
}

export function defaultRouteForGroups(groups: readonly string[] | undefined): string {
  if (isSuperAdmin(groups)) return "/super-admin";
  if (hasRole(groups, "admin")) return "/admin";
  if (isCustomer(groups)) return "/account";
  return "/account";
}

/** True if the user belongs to any of the supplied roles. */
export function hasAnyRole(groups: readonly string[] | undefined, roles: readonly CognitoGroup[]): boolean {
  return roles.some((r) => hasRole(groups, r));
}
