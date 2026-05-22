import { WebhooksHelper } from "square";
import { verifyShippoWebhookSignature } from "@/lib/webhooks/shippo/verifyShippoWebhookSignature";

export type ReplaySignatureVerification =
  | { required: false; verified: false; status: "unconfigured"; note?: string }
  | { required: true; verified: true; status: "verified" }
  | { required: true; verified: false; status: "no_signature_header" }
  | { required: true; verified: false; status: "invalid_signature" };

/**
 * Mirrors production webhook guards for operator-pasted payloads. When verification is configured, callers should
 * treat `verified === false` as unsafe for **execute** (dry-run previews may still be returned with warnings).
 */
export async function replayWebhookSignatureVerification(opts: {
  provider: string;
  rawBody: string;
  signatureHeader: string | null | undefined;
}): Promise<ReplaySignatureVerification> {
  const hdr = opts.signatureHeader?.trim() ?? "";

  if (opts.provider === "square") {
    const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim();
    const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL?.trim();
    if (!key || !notificationUrl) {
      return { required: false, verified: false, status: "unconfigured", note: "Square signature env unset" };
    }
    if (!hdr) {
      return { required: true, verified: false, status: "no_signature_header" };
    }
    const ok = await WebhooksHelper.verifySignature({
      requestBody: opts.rawBody,
      signatureHeader: hdr,
      signatureKey: key,
      notificationUrl,
    });
    if (!ok) return { required: true, verified: false, status: "invalid_signature" };
    return { required: true, verified: true, status: "verified" };
  }

  if (opts.provider === "shippo") {
    const secret = process.env.SHIPPO_WEBHOOK_SECRET?.trim() ?? "";
    if (!secret) {
      return { required: false, verified: false, status: "unconfigured", note: "SHIPPO_WEBHOOK_SECRET unset" };
    }
    if (!hdr) {
      return { required: true, verified: false, status: "no_signature_header" };
    }
    const ok = verifyShippoWebhookSignature({ rawBody: opts.rawBody, signatureHeader: hdr, secret });
    if (!ok) return { required: true, verified: false, status: "invalid_signature" };
    return { required: true, verified: true, status: "verified" };
  }

  return {
    required: false,
    verified: false,
    status: "unconfigured",
    note: `Verification not modeled for provider ${opts.provider}`,
  };
}
