import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Square Notifications API webhook signature verification
 * (see https://developer.squareup.com/docs/webhooks/step3validate).
 *
 * Signing string (exact UTF-8 concatenation): `notificationUrl + rawRequestBody`.
 * Algorithm: Base64(HMAC_SHA256(secretKeyUtf8Bytes, `(notificationUrl + rawBody)` as UTF-8)).
 * Incoming header compares to that Base64 digest (decoded and checked with timing-safe equality).
 *
 * ── Pitfalls teams hit in production ──
 * - Calling `JSON.parse` / `request.json()` **before** verify (re-serialized JSON differs from Square's bytes).
 * - `SQUARE_WEBHOOK_NOTIFICATION_URL` mismatch vs Dashboard (scheme `https://`, hostname, **path**, **trailing slash**).
 * - Trimming or otherwise mutating `rawBody` after read (signature is over Square's exact bytes).
 * - Reverse proxies decompressing gzipped payloads or rewriting bodies differently than Square signed.
 * - Swapping Sandbox vs Production **signature key** for the subscription (env must match the subscription).
 * - Relying on non-constant-time string compare (`===` on Base64) for the MAC — prefer buffer `timingSafeEqual`.
 *
 * ── Standalone Express example (middleware) ──
 * ```
 * app.post('/square/webhooks',
 *   express.raw({ type: 'application/json' }),
 *   (req, res, next) => {
 *     const raw = req.body instanceof Buffer ? req.body.toString('utf8') : String(req.body ?? '');
 *     const sig =
 *       (req.headers['x-square-hmacsha256-signature'] as string | undefined)?.trim() ?? '';
 *     const ok = verifySquareWebhookSignature({
 *       rawBody: raw,
 *       signatureHeader: sig,
 *       signatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY!,
 *       notificationUrl: process.env.SQUARE_WEBHOOK_NOTIFICATION_URL!,
 *     });
 *     if (!ok) return res.status(401).send('invalid_signature');
 *     req.squareWebhookJson = JSON.parse(raw);
 *     next();
 *   });
 * ```
 * (Prefer `express.raw`/`bodyParser.raw` here so `raw` stays byte-identical before `express.json()` runs.)
 */

/** Documented Square header (case-insensitive in HTTP; Fetch `Headers` normalizes lookup). */
const SQUARE_HMAC_SHA256_SIGNATURE = "x-square-hmacsha256-signature";

/**
 * Read Square's webhook signature header. Official name per Square webhook validation docs:
 * **`x-square-hmacsha256-signature`** (`X-Square-Hmacsha256-Signature` over the wire — HTTP headers are case-insensitive).
 *
 * Older references sometimes abbreviate inconsistently — we only honor the documented name.
 */
export function readSquareWebhookSignatureHeader(req: Request): string {
  return req.headers.get(SQUARE_HMAC_SHA256_SIGNATURE)?.trim() ?? "";
}

/**
 * Validates that `rawBody` is exactly what Square POSTed (`request.text()`, `express.raw`, etc.).
 * Never pass `JSON.stringify(parsed)` output as `rawBody`.
 */
export function verifySquareWebhookSignature(opts: {
  rawBody: string;
  signatureHeader: string;
  signatureKey: string;
  notificationUrl: string;
}): boolean {
  const key = opts.signatureKey.trim();
  const notificationUrl = opts.notificationUrl.trim();
  const hdr = opts.signatureHeader.trim();

  if (!key.length || !notificationUrl.length || !hdr.length) return false;
  if (opts.rawBody === null || opts.rawBody === undefined) return false;

  const signingPayload = `${notificationUrl}${opts.rawBody}`;

  let expectedMac: Buffer;
  try {
    expectedMac = createHmac("sha256", key).update(signingPayload, "utf8").digest();
  } catch {
    return false;
  }

  let candidateMac: Buffer;
  try {
    candidateMac = Buffer.from(hdr, "base64");
  } catch {
    return false;
  }

  if (candidateMac.length !== expectedMac.length) return false;
  try {
    return timingSafeEqual(expectedMac, candidateMac);
  } catch {
    return false;
  }
}

function headerValuePreview(value: string | null | undefined, maxShown: number): string {
  const v = value ?? "";
  if (!v.length) return "(empty)";
  if (v.length <= maxShown) return v;
  return `${v.slice(0, maxShown)}…(totalLen=${v.length})`;
}

/**
 * Diagnostics when verification fails — **never** logs `signatureKey`.
 * Safe to emit at `warn`: includes header names observed, clipped header values, body prefix length.
 */
export function logSquareWebhookSignatureDiagnostics(opts: {
  req: Request;
  correlationTag?: string;
  rawBodyUtf8Length: number;
  rawBodyPrefixChars: number;
  rawBody: string;
  signatureHeaderSeen: string;
  notificationUrlUsedForSigning: string;
}): void {
  const tag = opts.correlationTag ?? "webhooks/square";
  const names: string[] = [];
  opts.req.headers.forEach((_v, k) => names.push(k));
  const interesting = names
    .filter((n) => /square/i.test(n) || /hmac/i.test(n))
    .sort();

  console.warn(`[${tag}] Square webhook signature verify failed`, {
    headerNamesInteresting: interesting.length ? interesting : names.sort(),
    signingNotificationUrlExact: opts.notificationUrlUsedForSigning,
    signatureHeaderChars: opts.signatureHeaderSeen.length,
    signatureHeaderPreview: headerValuePreview(opts.signatureHeaderSeen, 24),
    rawBodyUtf8Length: opts.rawBodyUtf8Length,
    rawBodyPrefix: opts.rawBodyPrefixChars > 0 ? headerValuePreview(opts.rawBody, opts.rawBodyPrefixChars) : "(skipped)",
    hint: `Confirm dashboard Notification URL equals signingNotificationUrlExact (scheme, path, trailing slash). Header must be '${SQUARE_HMAC_SHA256_SIGNATURE}'.`,
  });
}
