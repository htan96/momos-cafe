import type { LifecycleAuthorityDomain } from "@/lib/commerce/lifecycleAuthority/types";

export type LifecycleIntegritySeverity = "CRITICAL" | "HIGH" | "WARNING" | "INFO";

export type LifecycleIntegrityEntityRefs = {
  commerceOrderId?: string;
  paymentRecordId?: string;
  fulfillmentGroupId?: string;
  shipmentId?: string;
  refundCaseId?: string;
  notificationId?: string;
};

/**
 * Read-only diagnostic row for super-admin operations — **not** PSP or carrier truth.
 * Several codes are intentionally conservative and may false-positive during migrations or slow outbox drains.
 */
export type LifecycleIntegrityFinding = {
  code: string;
  severity: LifecycleIntegritySeverity;
  category: "PAYMENT" | "FULFILLMENT" | "REFUND" | "SHIPMENT" | "NOTIFICATION" | "WEBHOOK";
  message: string;
  entityRefs: LifecycleIntegrityEntityRefs;
  remediationHint?: string;
  /** Optional explainability overlay — see `lib/commerce/lifecycleAuthority` and commerce lifecycle authority doc. */
  authorityDomain?: LifecycleAuthorityDomain;
  authorityNote?: string;
};
