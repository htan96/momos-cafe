import type { OperationalActivitySeverity } from "@prisma/client";

/** Uppercase taxonomy — stored under `metadata.category`. */
export const PLATFORM_EVENT_CATEGORY = [
  "ORDER_EVENT",
  "PAYMENT_EVENT",
  "SHIPMENT_EVENT",
  "AUTH_EVENT",
  "MENU_EVENT",
  "SYSTEM_EVENT",
  "SECURITY_EVENT",
  "INCIDENT_EVENT",
] as const;

export type PlatformEventCategory = (typeof PLATFORM_EVENT_CATEGORY)[number];

export const PLATFORM_EVENT_SUBTYPE = {
  PAYMENT_WEBHOOK_PROCESSING_FAILED: "payment.webhook.processing_failed",
  SECURITY_WEBHOOK_SIGNATURE_INVALID: "security.webhook.signature_invalid",
  PAYMENT_SQUARE_ORPHAN_WEBHOOK: "payment.square.orphan_webhook",
  SHIPMENT_QUOTE_FAILED: "shipment.quote.failed",
  SHIPMENT_LABEL_FAILED: "shipment.label.failed",
  AUTH_LOGIN_FAILED: "auth.login.failed",
  ORDER_DRAFT_CREATE_FAILED: "order.draft.create_failed",
  PAYMENT_REGISTER_FAILED: "payment.register.failed",
  MENU_SYNC_FAILED: "menu.sync.failed",
  SYSTEM_EMAIL_SEND_FAILED: "system.email.send_failed",
  SYSTEM_EMAIL_INBOUND_FAILED: "system.email.inbound_failed",
  /** Successful persistence of inbound operational mail (Resend + SES SNS / forwarders). */
  SYSTEM_EMAIL_INBOUND_RECEIVED: "system.email.inbound_received",
  SYSTEM_INTEGRATION_DEGRADED: "system.integration.degraded",
  SYSTEM_INTEGRATION_OFFLINE: "system.integration.offline",
  SYSTEM_INTEGRATION_RECOVERED: "system.integration.recovered",
  SYSTEM_INTEGRATION_SLOW_RESPONSE: "system.integration.slow_response",
  SYSTEM_NOTIFICATION_PROCESS_FAILED: "system.notification.process_failed",
  /** SES / mailbox provider bounce fan-out lands here — ingestion placeholder / stub. */
  SYSTEM_EMAIL_BOUNCE_STUB_RECEIVED: "system.email.bounce_stub_received",
  /** SES chosen but infra incomplete — outbound temporarily routed via Resend (noise-capped informational). */
  SYSTEM_EMAIL_TRANSPORT_SES_FALLBACK: "system.email.transport_ses_fallback",
  /** Super-admin read-only Square payment hydrate + reconcile (recovery); not surfaced as failure inbox subtype. */
  PAYMENT_SUPER_ADMIN_SQUARE_LOOKUP: "payment.super_admin.square_lookup",
  /** Super-admin updated `OperationalIncident` lifecycle/metadata. */
  INCIDENT_OPERATOR_UPDATED: "incident.operator_updated",
} as const;

export type PlatformEventSubtype =
  (typeof PLATFORM_EVENT_SUBTYPE)[keyof typeof PLATFORM_EVENT_SUBTYPE];

export type PlatformLifecycle =
  | "started"
  | "processing"
  | "succeeded"
  | "failed"
  | "compensated"
  | "cancelled";

/** Narrow helper — default platform failures ship as `warning` unless caller overrides. */
export function defaultSeverityForLifecycle(lifecycle: PlatformLifecycle): OperationalActivitySeverity {
  if (lifecycle === "failed" || lifecycle === "cancelled") return "warning";
  if (lifecycle === "compensated") return "error";
  return "info";
}
