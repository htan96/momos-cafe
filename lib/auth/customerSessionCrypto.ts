/**
 * Customer storefront session — **separate cookie & secret** from ops (`OPS_SESSION`).
 * Payload is intentionally minimal; authorization for `/ops/*` never uses this cookie.
 */

export const CUSTOMER_SESSION_COOKIE = "MOMOS_CUSTOMER";

export type CustomerSessionPayload = {
  typ: "customer";
  sub: string;
  email: string;
  exp: number;
};

export function customerSigningKeyMaterial(): string | null {
  const primary = process.env.CUSTOMER_SESSION_SECRET?.trim();
  if (!primary || primary.length < 24) return null;
  const pepper = process.env.CUSTOMER_SESSION_PEPPER?.trim() ?? "";
  return `${primary}|${pepper}`;
}

function base64UrlEncodeBytes(buf: BufferSource): string {
  const bytes =
    buf instanceof ArrayBuffer
      ? new Uint8Array(buf)
      : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecodeToString(b64url: string): string {
  const pad = b64url.length % 4 === 0 ? "" : "=".repeat(4 - (b64url.length % 4));
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signCustomerSessionPayload(
  payload: CustomerSessionPayload
): Promise<string | null> {
  const material = customerSigningKeyMaterial();
  if (!material) return null;
  const payloadSegment = base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importHmacKey(material);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadSegment) as BufferSource
  );
  const sigSegment = base64UrlEncodeBytes(sig);
  return `${payloadSegment}.${sigSegment}`;
}

function base64UrlToUint8Array(b64url: string): Uint8Array {
  const pad = b64url.length % 4 === 0 ? "" : "=".repeat(4 - (b64url.length % 4));
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function verifyCustomerSessionToken(
  token: string | undefined | null
): Promise<CustomerSessionPayload | null> {
  const material = customerSigningKeyMaterial();
  if (!material || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadSegment, sigSegment] = parts;
  if (!payloadSegment || !sigSegment) return null;

  try {
    const key = await importHmacKey(material);
    const sigBytes = base64UrlToUint8Array(sigSegment);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as BufferSource,
      new TextEncoder().encode(payloadSegment) as BufferSource
    );
    if (!ok) return null;

    const raw = base64UrlDecodeToString(payloadSegment);
    const parsed = JSON.parse(raw) as CustomerSessionPayload;
    if (parsed.typ !== "customer") return null;
    if (typeof parsed.sub !== "string" || typeof parsed.email !== "string" || typeof parsed.exp !== "number") {
      return null;
    }
    if (parsed.exp < Date.now() / 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}
