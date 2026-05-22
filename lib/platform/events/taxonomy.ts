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
  /** Carrier / Shippo tracking ingest — provider-agnostic Commerce `Shipment` timelines. */
  SHIPMENT_TRACKING_UPDATED: "shipment.tracking_updated",
  SHIPMENT_IN_TRANSIT: "shipment.in_transit",
  SHIPMENT_OUT_FOR_DELIVERY: "shipment.out_for_delivery",
  SHIPMENT_DELIVERED: "shipment.delivered",
  SHIPMENT_EXCEPTION: "shipment.exception",
  SHIPMENT_RETURNED: "shipment.returned",
  SHIPMENT_FAILURE: "shipment.failure",
  SHIPMENT_WEBHOOK_PROCESSING_FAILED: "shipment.webhook.processing_failed",
  SHIPMENT_WEBHOOK_ORPHAN: "shipment.webhook.orphan",
  SHIPMENT_WEBHOOK_UNHANDLED_EVENT: "shipment.webhook.unhandled_event",
  SHIPMENT_WEBHOOK_IGNORED: "shipment.webhook.ignored",
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
  /** Operational support desk — persisted `OperationalSupportIssue` row opened. */
  SUPPORT_ISSUE_CREATED: "support.issue_created",
  /** Operational support desk — persisted `OperationalSupportIssue` materially changed (status/title/etc.). */
  SUPPORT_ISSUE_UPDATED: "support.issue_updated",
  /**
   * `FulfillmentGroup.status` transitioned through the validated orchestration gates
   * (ops console or automation). Emitted once per persisted update.
   */
  FULFILLMENT_GROUP_STATUS_CHANGED: "fulfillment.group_status_changed",
  /** Ops refund shell — analyst opened a coordinated refund row (Square not yet instructed). */
  REFUND_CASE_REQUESTED: "refund.case_requested",
  REFUND_CASE_REVIEWING: "refund.case_reviewing",
  REFUND_CASE_APPROVED: "refund.case_approved",
  REFUND_CASE_DENIED: "refund.case_denied",
  /** Square Refunds API accepted the refund request (`refundPayment` returned). */
  REFUND_CASE_SUBMITTED_TO_SQUARE: "refund.case_submitted_to_square",
  REFUND_CASE_SQUARE_COMPLETED: "refund.case_square_completed",
  REFUND_CASE_SQUARE_FAILED: "refund.case_square_failed",
  /** Square Refunds API rejected the attempt before a durable refund id was stored. */
  REFUND_CASE_FAILED: "refund.case_failed",
  /** Ops internal coordination note persisted on commerce/customer timelines. */
  COMMUNICATION_INTERNAL_NOTE_ADDED: "communication.internal_note_added",
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
