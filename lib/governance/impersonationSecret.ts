/**
 * `IMPERSONATION_SECRET` signs the HttpOnly `momos_impersonation` cookie (HMAC-SHA256).
 * Production: required (min 32 chars recommended).
 * Development: set explicitly, or set `IMPERSONATION_ALLOW_UNSAFE_DEV=true` to allow a deterministic
 * dev-only secret (logged once) — **never** enable in production.
 */

const DEV_FLAG = "IMPERSONATION_ALLOW_UNSAFE_DEV";

export function getImpersonationSecretForSigning(): string | null {
  const raw = process.env.IMPERSONATION_SECRET?.trim();
  if (raw && raw.length >= 16) return raw;

  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    return null;
  }

  if (process.env[DEV_FLAG]?.trim() === "true") {
    return "momos-dev-insecure-impersonation-secret-do-not-use-in-prod";
  }

  return null;
}

export function getImpersonationSecretForVerification(): string | null {
  return getImpersonationSecretForSigning();
}
