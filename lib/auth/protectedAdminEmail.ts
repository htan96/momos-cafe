/**
 * `BOOTSTRAP_ADMIN_EMAIL` env: immutable protected super-admin identifier (typically email).
 * Never log raw values — only derive normalized booleans/compare here.
 */

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizedProtectedAdminEmail(): string | null {
  const raw = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  return raw?.length ? normalizeEmail(raw) : null;
}

export function isProtectedAdminLoginEmail(candidate: string): boolean {
  const guard = normalizedProtectedAdminEmail();
  if (!guard) return false;
  return normalizeEmail(candidate) === guard;
}
