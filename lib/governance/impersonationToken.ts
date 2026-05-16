import type { ImpersonationScope } from "@/lib/governance/impersonationConstants";

export type ImpersonationPayload = {
  actorSub: string;
  actorEmail: string;
  targetEmail: string;
  targetSub?: string;
  scope: ImpersonationScope;
  issuedAt: number;
  /** `ImpersonationSupportSession.id` — required for new tokens (ledger must be active server-side). */
  ledgerId: string;
  /** Public correlation id (`momos_presence_sid` when present at start). */
  sessionPublicId: string;
};

const encoder = new TextEncoder();

function bufferToBase64Url(data: BufferSource): string {
  const bytes =
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** HMAC-SHA256 over UTF-8 JSON payload; token = base64url(json).base64url(sig). Edge + Node compatible. */
export async function signImpersonationPayload(
  payload: ImpersonationPayload,
  secret: string
): Promise<string> {
  const json = JSON.stringify(payload);
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(json));
  const sigPart = bufferToBase64Url(sig);
  const payloadPart = bufferToBase64Url(encoder.encode(json));
  return `${payloadPart}.${sigPart}`;
}

function toArrayBuffer(u: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(u.byteLength);
  new Uint8Array(out).set(u);
  return out;
}

export async function verifyImpersonationToken(
  token: string,
  secret: string
): Promise<ImpersonationPayload | null> {
  const idx = token.indexOf(".");
  if (idx <= 0) return null;
  const payloadPart = token.slice(0, idx);
  const sigPart = token.slice(idx + 1);
  if (!sigPart) return null;

  let jsonBytes: Uint8Array;
  try {
    jsonBytes = base64UrlToBytes(payloadPart);
  } catch {
    return null;
  }

  const json = new TextDecoder().decode(jsonBytes);
  const key = await importHmacKey(secret);
  let sigBytes: Uint8Array;
  try {
    sigBytes = base64UrlToBytes(sigPart);
  } catch {
    return null;
  }

  const ok = await crypto.subtle.verify("HMAC", key, toArrayBuffer(sigBytes), toArrayBuffer(jsonBytes));
  if (!ok) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const actorSub = typeof o.actorSub === "string" ? o.actorSub.trim() : "";
  const actorEmail = typeof o.actorEmail === "string" ? o.actorEmail.trim() : "";
  const targetEmail = typeof o.targetEmail === "string" ? o.targetEmail.trim() : "";
  const targetSub = typeof o.targetSub === "string" ? o.targetSub.trim() : undefined;
  const scope = o.scope === "customer" || o.scope === "admin" ? o.scope : null;
  const issuedAt = typeof o.issuedAt === "number" ? o.issuedAt : NaN;
  const ledgerId = typeof o.ledgerId === "string" ? o.ledgerId.trim() : "";
  const sessionPublicId = typeof o.sessionPublicId === "string" ? o.sessionPublicId.trim() : "";

  if (
    !actorSub ||
    !actorEmail ||
    !targetEmail ||
    !scope ||
    !Number.isFinite(issuedAt) ||
    !ledgerId ||
    !sessionPublicId
  ) {
    return null;
  }

  return {
    actorSub,
    actorEmail,
    targetEmail,
    targetSub: targetSub || undefined,
    scope,
    issuedAt,
    ledgerId,
    sessionPublicId,
  };
}
