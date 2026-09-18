import type { AccountMgmtRole } from "@/lib/accountManagement/accountsBrowse";
import { userRoleToAccountMgmtRole } from "@/lib/auth/userAuthority";
import type { UserRole } from "@prisma/client";

export function deriveAccountRoleFromGroups(groups: readonly string[]): AccountMgmtRole {
  const g = new Set(groups);
  if (g.has("super_admin")) return "super_admin";
  if (g.has("admin")) return "admin";
  return "customer";
}

export function deriveAccountRoleFromDbRole(role: UserRole): AccountMgmtRole {
  return userRoleToAccountMgmtRole(role);
}
