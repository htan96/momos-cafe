import type { AuthUser } from "@/lib/auth/AuthProvider";
import {
  cognitoGroupsForUserRole,
  isActiveUserStatus,
  userRoleToAccountMgmtRole,
  userRoleToCognitoGroup,
  deriveUserRoleFromCognitoGroups,
} from "@/lib/auth/userAuthority";
import type { CognitoGroup } from "@/lib/auth/cognito/types";
import type { UserRole, UserStatus } from "@prisma/client";

export const KNOWN_COGNITO_GROUPS: readonly CognitoGroup[] = [
  "super_admin",
  "admin",
  "customer",
] as const;

export type RoleCheckInput = readonly string[] | AuthUser;

function isAuthUser(input: RoleCheckInput): input is AuthUser {
  return !Array.isArray(input);
}

function resolveAccountRole(input: RoleCheckInput): "customer" | "admin" | "super_admin" {
  if (isAuthUser(input) && input.isBootstrapAdmin) {
    return "super_admin";
  }
  if (isAuthUser(input) && input.role) {
    return userRoleToAccountMgmtRole(input.role);
  }
  const groups = isAuthUser(input) ? (input.groups ?? []) : input;
  if (groups.includes("super_admin")) return "super_admin";
  if (groups.includes("admin")) return "admin";
  if (groups.includes("customer")) return "customer";
  const derived = deriveUserRoleFromCognitoGroups(groups);
  if (derived === "SuperAdmin") return "super_admin";
  if (derived === "Admin") return "admin";
  return "customer";
}

function isActiveForCheck(input: RoleCheckInput): boolean {
  if (isAuthUser(input) && input.status) {
    return isActiveUserStatus(input.status);
  }
  return true;
}

export function hasRole(input: RoleCheckInput, role: CognitoGroup): boolean {
  if (!isActiveForCheck(input)) return false;
  return resolveAccountRole(input) === role;
}

export function isSuperAdmin(input: RoleCheckInput): boolean {
  if (!isActiveForCheck(input)) return false;
  return resolveAccountRole(input) === "super_admin";
}

export function isAdmin(input: RoleCheckInput): boolean {
  if (!isActiveForCheck(input)) return false;
  const r = resolveAccountRole(input);
  return r === "admin" || r === "super_admin";
}

export function isCustomer(input: RoleCheckInput): boolean {
  if (!isActiveForCheck(input)) return false;
  return resolveAccountRole(input) === "customer";
}

export function defaultRouteForGroups(groups: readonly string[] | undefined): string {
  return defaultRouteForAuthority(groups ?? []);
}

export function defaultRouteForAuthority(input: RoleCheckInput): string {
  if (isSuperAdmin(input)) return "/super-admin";
  if (hasRole(input, "admin")) return "/admin";
  if (isCustomer(input)) return "/account";
  return "/account";
}

/** True if the user belongs to any of the supplied roles. */
export function hasAnyRole(
  input: RoleCheckInput,
  roles: readonly CognitoGroup[]
): boolean {
  return roles.some((r) => hasRole(input, r));
}

/** Effective Cognito-style group list for redirects / legacy clients. */
export function effectiveGroupsFromInput(input: RoleCheckInput): readonly string[] {
  if (isAuthUser(input)) {
    if (input.role) return cognitoGroupsForUserRole(input.role);
    return input.groups ?? [];
  }
  return input;
}

export function userRoleFromInput(input: RoleCheckInput): UserRole | null {
  if (isAuthUser(input) && input.role) return input.role;
  const groups = isAuthUser(input) ? (input.groups ?? []) : input;
  return deriveUserRoleFromCognitoGroups(groups);
}

export function userStatusFromInput(input: RoleCheckInput): UserStatus | null {
  if (isAuthUser(input) && input.status) return input.status;
  return null;
}

export { userRoleToCognitoGroup };
