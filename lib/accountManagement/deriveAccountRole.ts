import type { AccountMgmtRole } from "@/lib/accountManagement/accountsBrowse";

export function deriveAccountRoleFromGroups(groups: readonly string[]): AccountMgmtRole {
  const g = new Set(groups);
  if (g.has("super_admin")) return "super_admin";
  if (g.has("admin")) return "admin";
  return "customer";
}
