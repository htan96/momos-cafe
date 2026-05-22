import { NextResponse } from "next/server";

/**
 * Production/runtime detection for webhook fail-closed policy.
 * Vercel sets `VERCEL_ENV=production`; other hosts rely on NODE_ENV.
 */
export function shippoInboundIsProductionLikeRuntime(): boolean {
  const nodeProd = process.env.NODE_ENV === "production";
  const vercelProd = process.env.VERCEL_ENV === "production";
  return nodeProd || vercelProd;
}

/** Non-empty `SHIPPO_WEBHOOK_SECRET` required for verified ingress. */
export function getShippoInboundWebhookSecretTrimmed(): string {
  return process.env.SHIPPO_WEBHOOK_SECRET?.trim() ?? "";
}

/**
 * Production: reject all Shippo webhook traffic unless HMAC verification can run.
 * Prevent spoofed lifecycle updates when secret is accidentally unset.
 */
export function rejectShippoWebhookIfProductionMisconfigured(): NextResponse | null {
  if (!shippoInboundIsProductionLikeRuntime()) return null;
  if (getShippoInboundWebhookSecretTrimmed().length > 0) return null;
  console.error("[webhooks/shippo] SHIPPO_WEBHOOK_SECRET missing — rejecting traffic (production fail-closed)");
  return NextResponse.json({ error: "shippo_webhook_hmac_required_in_production" }, { status: 503 });
}
