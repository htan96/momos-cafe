import { Webhook } from "svix";

/** Validates Resend (Svix) webhook authenticity — raw body string required */
export function verifyResendInbound(rawBody: string, headers: Headers): Record<string, unknown> {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("MISSING_RESEND_WEBHOOK_SECRET");
  }
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sig = headers.get("svix-signature");
  if (!id || !ts || !sig) {
    throw new Error("MISSING_SVIX_HEADERS");
  }
  const wh = new Webhook(secret);
  return wh.verify(rawBody, {
    "svix-id": id,
    "svix-timestamp": ts,
    "svix-signature": sig,
  }) as Record<string, unknown>;
}
