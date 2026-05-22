/** Loose guard for `@default(cuid())` identifiers (ops desk rows — not Postgres UUID shells). */
const CUID_RE = /^c[a-z0-9]{8,}$/i;

export function looksLikeOperationalCuid(value: unknown): value is string {
  return typeof value === "string" && CUID_RE.test(value.trim()) && value.trim().length <= 64;
}
