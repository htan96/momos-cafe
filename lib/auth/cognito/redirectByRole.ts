import { defaultRouteForAuthority, isCustomer } from "@/lib/auth/cognito/roles";
import type { AuthUser } from "@/lib/auth/AuthProvider";

export function safeInternalPath(raw: string | null | undefined, fallback: string): string {
  const t = (raw ?? "").trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.includes("://")) return fallback;
  return t.slice(0, 512) || fallback;
}

/** Storefront account hub — staff should not inherit `?next=/account` from header login links. */
export function isCustomerAccountPath(path: string): boolean {
  return path === "/account" || path.startsWith("/account/");
}

/** Prefer a safe `next` when present; otherwise route by DB role or Cognito groups. */
export function resolvePostLoginRedirect(
  groupsOrUser: readonly string[] | AuthUser | undefined,
  nextParam: string | null | undefined
): string {
  const fallback =
    groupsOrUser && typeof groupsOrUser === "object" && "sub" in groupsOrUser
      ? defaultRouteForAuthority(groupsOrUser)
      : defaultRouteForAuthority(groupsOrUser ?? []);
  if (nextParam == null || nextParam === "") return fallback;
  const next = safeInternalPath(nextParam, fallback);
  const authority = groupsOrUser ?? [];
  if (!isCustomer(authority) && isCustomerAccountPath(next)) {
    return fallback;
  }
  return next;
}
