const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10,11}\b/g;

const PII_KEY_RE = /(email|phone|mobile|recipient|toAddress|fromAddress|targetEmail)/i;

function redactString(value: string): string {
  return value.replace(EMAIL_RE, "[redacted-email]").replace(PHONE_RE, "[redacted-phone]");
}

/**
 * Deep-clones JSON for super-admin detail views — redacts emails/phones in strings and common PII keys.
 */
export function redactFailureMetadata(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(redactFailureMetadata);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (PII_KEY_RE.test(k) && typeof v === "string") {
        out[k] = "[redacted]";
      } else {
        out[k] = redactFailureMetadata(v);
      }
    }
    return out;
  }
  return value;
}
