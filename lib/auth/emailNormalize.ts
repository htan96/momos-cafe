export function normalizeAuthEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Prevent open redirects — internal paths only */
export function safeAuthRedirectPath(raw: string | null | undefined, fallback: string): string {
  if (!raw || typeof raw !== "string") return fallback;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.includes("://")) return fallback;
  return t.slice(0, 512) || fallback;
}
