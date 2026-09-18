import { normalizeEmail } from "@/lib/auth/protectedAdminEmail";

export const MOMOS_BOOTSTRAP_SESSION_COOKIE = "momos_bootstrap_admin" as const;
export const MOMOS_BOOTSTRAP_PENDING_COOKIE = "momos_bootstrap_pending" as const;

const BOOTSTRAP_SESSION_MAX_AGE_SEC = 8 * 60 * 60;
const BOOTSTRAP_PENDING_MAX_AGE_SEC = 10 * 60;

export const BOOTSTRAP_SUPER_ADMIN_GROUP = "super_admin" as const;

export function bootstrapSessionMaxAgeSec(): number {
  return BOOTSTRAP_SESSION_MAX_AGE_SEC;
}

export function bootstrapPendingMaxAgeSec(): number {
  return BOOTSTRAP_PENDING_MAX_AGE_SEC;
}

export function normalizedBootstrapAdminEmail(): string | null {
  const raw = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  return raw?.length ? normalizeEmail(raw) : null;
}

export function bootstrapAdminAuthEnabled(): boolean {
  const email = normalizedBootstrapAdminEmail();
  const pass = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim();
  if (!email?.length || !pass?.length) return false;
  if (process.env.BOOTSTRAP_ADMIN_TOTP_REQUIRED === "0") return false;
  return true;
}

export function isBootstrapAdminEmail(candidate: string): boolean {
  const guard = normalizedBootstrapAdminEmail();
  if (!guard) return false;
  return normalizeEmail(candidate) === guard;
}

export function bootstrapTotpRequired(): boolean {
  if (process.env.BOOTSTRAP_ADMIN_TOTP_REQUIRED === "0") return false;
  return true;
}

export function bootstrapCognitoSubForEmail(emailNorm: string): string {
  return `bootstrap:${emailNorm}`;
}
