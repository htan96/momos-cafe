import type { PlatformEventSubtype } from "@/lib/platform/events/taxonomy";

/** Event `type` values persisted to `OperationalActivityEvent.type` (only types emitted by the app). */
export const OPERATIONAL_EVENT_TYPES = {
  ORDER_CREATED: "order.created",
  /** Pending `PaymentRecord` created (checkout register / Square charge not yet finalized). */
  PAYMENT_PENDING_REGISTERED: "payment.pending_registered",
  PAYMENT_SUCCEEDED: "payment.succeeded",
  PAYMENT_FAILED: "payment.failed",
  AUTH_LOGIN: "auth.login",
  MENU_SYNCED: "menu.synced",
  MAINTENANCE_UPDATED: "maintenance.updated",
  CUSTOMER_REGISTERED: "customer.registered",
  SHIPMENT_LABEL_CREATED: "shipment.label_created",
  /** RETAIL fulfillment group acknowledgement before gated Shippo purchases (staff-driven). */
  FULFILLMENT_APPROVED: "fulfillment.approved",
  PLATFORM_FEATURE_TOGGLED: "platform.feature_toggled",
  GOVERNANCE_CONTROL_UPDATED: "governance.control_updated",
  AUTH_LOGOUT: "auth.logout",
  PRESENCE_IMPERSONATION_STARTED: "presence.impersonation_started",
  PRESENCE_IMPERSONATION_ENDED: "presence.impersonation_ended",
  /** Catering form / persistence pipeline failed after client submit (see `submissionError` on row when stored). */
  CATERING_INQUIRY_FAILED: "catering.inquiry_failed",
  USER_ROLE_CHANGED: "user.role_changed",
  ADMIN_PROMOTED: "access.admin_promoted",
  ADMIN_DEMOTED: "access.admin_demoted",
} as const;

/** Includes canonical platform backbone subtypes from `PLATFORM_EVENT_SUBTYPE`. */
export type OperationalEventType =
  | (typeof OPERATIONAL_EVENT_TYPES)[keyof typeof OPERATIONAL_EVENT_TYPES]
  | PlatformEventSubtype;
