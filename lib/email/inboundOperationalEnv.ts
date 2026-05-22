/**
 * SES operational inbound routing (reply-plus addressing + shared mailbox aliases).
 */

function domainFromFromEmail(fromEmailEnv: string | undefined): string | null {
  const raw = fromEmailEnv?.trim();
  if (!raw || !raw.includes("@")) return null;
  const at = raw.lastIndexOf("@");
  const d = raw.slice(at + 1).trim().toLowerCase();
  return d || null;
}

/** Public inbound domain (`reply+<token>@...`, `support@...`, …). */
export function resolveSesInboundOperationalDomain(): string | null {
  const explicit = process.env.SES_INBOUND_REPLY_DOMAIN?.trim().toLowerCase();
  if (explicit) return explicit;
  return domainFromFromEmail(process.env.SES_FROM_EMAIL);
}

export type OperationalMailboxMatch =
  | { kind: "support" }
  | { kind: "catering" }
  | { kind: "reply"; token: string }
  | null;

const RE_REPLY_PLUS =
  /^reply\+([^@\s]+)@([^>\s]+)$/i;

/** Returns whether any operational recipient accepts this SES path. Resend skips this gate. */
export function matchOperationalRecipient(email: string, domain: string): OperationalMailboxMatch {
  const trimmed = email.trim().toLowerCase();
  const d = domain.toLowerCase();
  const rp = trimmed.match(RE_REPLY_PLUS);
  if (rp && rp[2].toLowerCase() === d) {
    return { kind: "reply", token: rp[1].trim() };
  }
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return null;
  const local = trimmed.slice(0, at).toLowerCase();
  const dom = trimmed.slice(at + 1).toLowerCase();
  if (dom !== d) return null;
  const supportLp = process.env.SES_OPS_SUPPORT_LOCALPART?.trim().toLowerCase() ?? "support";
  const cateringLp = process.env.SES_OPS_CATERING_LOCALPART?.trim().toLowerCase() ?? "catering";
  if (local === supportLp) return { kind: "support" };
  if (local === cateringLp) return { kind: "catering" };
  return null;
}

export function hasOperationalSesRecipient(emails: string[], domain: string | null): boolean {
  if (!domain) return false;
  return emails.some((e) => matchOperationalRecipient(e, domain));
}
