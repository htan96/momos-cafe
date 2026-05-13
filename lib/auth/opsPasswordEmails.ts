import { normalizeAuthEmail } from "@/lib/auth/emailNormalize";

/**
 * Emails that use the password step against `/api/ops/auth/login` from `/login/email` or `/ops/login`.
 * Starts with `OPS_ADMIN_EMAIL`; extend via comma-separated `OPS_PASSWORD_LOGIN_EMAILS`.
 */
export function listOpsPasswordEmails(): string[] {
  const primary = normalizeAuthEmail(process.env.OPS_ADMIN_EMAIL ?? "");
  const extraRaw = process.env.OPS_PASSWORD_LOGIN_EMAILS ?? "";
  const extras = extraRaw
    .split(/[,;\s]+/)
    .map((s) => normalizeAuthEmail(s))
    .filter(Boolean);
  const set = new Set<string>();
  if (primary) set.add(primary);
  for (const e of extras) set.add(e);
  return [...set];
}

export function isOpsPasswordLoginEmail(normalizedEmail: string): boolean {
  return listOpsPasswordEmails().includes(normalizedEmail);
}
