/** Canonical public origin for magic-link URLs (server-side). */
export function getAuthPublicBaseUrl(): string | null {
  const raw =
    process.env.AUTH_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "";
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.origin;
  } catch {
    return null;
  }
}
