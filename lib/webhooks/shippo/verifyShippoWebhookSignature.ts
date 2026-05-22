import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_MAX_SKEW_SEC = 600;

/**
 * Shippo webhook HMAC (see https://docs.goshippo.com/docs/tracking/webhooksecurity):
 * Header `SHIPPO_AUTH_SIGNATURE` is typically surfaced as **`shippo-auth-signature`**.
 * Format: `t=<unix_secs>,v1=<hex_hmac>` where hex is SHA256-HMAC(secret, `${t}.${rawBody}`).
 */
function parseShippoAuthSignatureHeader(header: string | null | undefined): { t?: string; v1?: string } {
  if (!header || typeof header !== "string") return {};
  const out: Record<string, string> = {};
  const chunks = header.split(",");
  for (const chunk of chunks) {
    const idx = chunk.indexOf("=");
    if (idx === -1) continue;
    const k = chunk.slice(0, idx).trim().toLowerCase();
    const v = chunk.slice(idx + 1).trim();
    if (!k || !v) continue;
    out[k] = v;
  }
  return { t: out.t, v1: out.v1 };
}

function readShippoTimestampSeconds(t: string | undefined): number | null {
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) && n > 1_000_000_000 ? n : null;
}

/** Constant-time equality for equal-length lowercase hex buffers. */
function timingSafeHexEqualHex(aHex: string, bHex: string): boolean {
  const a = aHex.trim().toLowerCase();
  const b = bHex.trim().toLowerCase();
  try {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ab.length !== bb.length || ab.length === 0) return false;
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

export function verifyShippoWebhookSignature(opts: {
  rawBody: string;
  signatureHeader: string | null | undefined;
  secret: string;
  maxSkewSeconds?: number;
}): boolean {
  const secret = opts.secret.trim();
  if (!secret) return false;
  const parsed = parseShippoAuthSignatureHeader(opts.signatureHeader ?? null);
  if (!parsed.v1 || !parsed.t) return false;

  const maxSkew = opts.maxSkewSeconds ?? DEFAULT_MAX_SKEW_SEC;
  const tsSecs = readShippoTimestampSeconds(parsed.t);
  if (tsSecs != null) {
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - tsSecs) > maxSkew) return false;
  }

  const signedPayload = `${parsed.t}.${opts.rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  return timingSafeHexEqualHex(expected, parsed.v1);
}

/**
 * Prefer `Shippo-Auth-Signature`; fall back if proxies normalize differently.
 */
export function readShippoSignatureHeader(req: Request): string {
  const a = req.headers.get("shippo-auth-signature")?.trim();
  if (a) return a;
  const b = req.headers.get("Shippo-Auth-Signature")?.trim();
  if (b) return b;
  return req.headers.get("HTTP_SHIPPO_AUTH_SIGNATURE")?.trim() ?? "";
}
