import { defaultRouteForGroups } from "@/lib/auth/cognito/roles";

export function safeInternalPath(raw: string | null | undefined, fallback: string): string {
  const t = (raw ?? "").trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.includes("://")) return fallback;
  return t.slice(0, 512) || fallback;
}

/** Prefer a safe `next` when present; otherwise route by Cognito groups. */
export function resolvePostLoginRedirect(
  groups: readonly string[] | undefined,
  nextParam: string | null | undefined
): string {
  const fallback = defaultRouteForGroups(groups);
  if (nextParam == null || nextParam === "") return fallback;
  return safeInternalPath(nextParam, fallback);
}
