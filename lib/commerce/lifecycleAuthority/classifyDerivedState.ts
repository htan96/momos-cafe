import type { LifecycleIntegrityFinding } from "@/lib/commerce/lifecycleIntegrity/types";
import type { CommerceOrderStatus } from "@/lib/commerce/orderLifecycle";
import {
  COMMERCE_ORDER_STATUSES,
  RETAIL_FULFILLMENT_STATUSES,
  KITCHEN_FULFILLMENT_STATUSES,
} from "@/lib/commerce/orderLifecycle";

import type { DerivedStateClassification, LifecycleAuthorityDomain } from "./types";

/** Minimal CommerceOrder slices for classifier inputs (pure; no DB). */
export type CommerceOrderAuthorityInput = {
  status: string;
};

/** Minimal PaymentRecord slices — local mirror of PSP posture. */
export type PaymentRecordAuthorityInput = {
  status: string;
  squarePaymentId: string | null | undefined;
  squarePaymentStatus: string | null | undefined;
};

export type FulfillmentGroupAuthorityInput = {
  pipeline: string;
  status: string;
};

export type ShipmentAuthorityInput = {
  status: string;
  carrier: string | null | undefined;
};

export type NotificationEventAuthorityInput = {
  processedAt: Date | string | null | undefined;
  type: string;
};

export type RefundCaseAuthorityInput = {
  status: string;
  paymentRecordId: string | null | undefined;
  squareRefundId?: string | null | undefined;
};

function isCommerceOrderStatus(s: string): s is CommerceOrderStatus {
  return (COMMERCE_ORDER_STATUSES as readonly string[]).includes(s);
}

/**
 * CommerceOrder coarse status is owned by platform business rules summarizing PSP + fulfillment subgraphs —
 * treat as **derived** relative to PSP/carrier primitives.
 */
export function classifyCommerceOrderAggregate(input: CommerceOrderAuthorityInput): DerivedStateClassification {
  if (!isCommerceOrderStatus(input.status)) return "reconciliation_only";
  return "derived";
}

/**
 * Stored payment rows reconcile to Square IDs + statuses — mirror is **authoritative** for deployed automation once captured,
 * but **reconciliation_only** versus Square Dashboard when diagnosing drift/heuristics.
 */
export function classifyPaymentRecordMirror(input: PaymentRecordAuthorityInput): DerivedStateClassification {
  const hasSquare = Boolean(input.squarePaymentId?.trim());
  if (!hasSquare && input.status === "pending") return "authoritative"; // shell row until PSP echoes
  if (hasSquare) return "authoritative";
  return "reconciliation_only";
}

/** Fulfillment group status is fulfillment-authoritative ops state persisted per pipeline. */
export function classifyFulfillmentGroupState(input: FulfillmentGroupAuthorityInput): DerivedStateClassification {
  const s = input.status.trim();
  if (input.pipeline === "KITCHEN" && (KITCHEN_FULFILLMENT_STATUSES as readonly string[]).includes(s))
    return "authoritative";
  if (input.pipeline === "RETAIL" && (RETAIL_FULFILLMENT_STATUSES as readonly string[]).includes(s)) return "authoritative";
  return "reconciliation_only";
}

/** Shipment row mirrors carriers/Shippo — locally authoritative persistence of upstream projection when healthy. */
export function classifyShipmentProjection(input: ShipmentAuthorityInput): DerivedStateClassification {
  if (!input.status.trim()) return "reconciliation_only";
  return "authoritative";
}

/** NotificationEvent describes orchestrated work — authoritative for backlog state, never financial truth. */
export function classifyNotificationOrchestrationState(_input: NotificationEventAuthorityInput): DerivedStateClassification {
  return "authoritative";
}

/** Refund operational cases coordinate humans + PSP — authoritative for workflow row, reconciliation-only versus PSP refunds. */
export function classifyOperationalRefundSurface(input: RefundCaseAuthorityInput): DerivedStateClassification {
  const linked = Boolean(input.paymentRecordId?.trim());
  const pspRefund = Boolean(input.squareRefundId?.trim());
  if (!linked && !pspRefund) return "reconciliation_only";
  return "authoritative";
}

const CATEGORY_TO_DOMAIN = {
  PAYMENT: "psp_payment",
  FULFILLMENT: "fulfillment",
  REFUND: "operational_support_refund",
  SHIPMENT: "shipment",
  NOTIFICATION: "notification_outbox",
  WEBHOOK: "replay_recovery_audit",
} as const satisfies Record<LifecycleIntegrityFinding["category"], LifecycleAuthorityDomain>;

const CODE_SPECIFIC_NOTES: Partial<Record<string, string>> = {
  PAID_LIKE_ORDER_WITHOUT_COMPLETED_PAYMENT:
    "Coarse commerce status advanced while PaymentRecord shells disagree — PSP + local mirror reconciliation required before mutating aggregates.",
  FULFILLMENT_PROGRESS_PRE_PAYMENT_SHELL:
    "Fulfillment subgraph ahead of PSP-settled precondition — revisit payment integrity before widening fulfillment posture.",
  NOTIFICATION_OUTBOX_PENDING_ORDER_TERMINAL:
    "Outbox backlog overlays terminal commerce aggregates — backlog is authoritative for queued work only.",
  SHIPPO_WEBHOOK_ORPHAN_NO_LOCAL_SHIPMENT:
    "Receipt audit trail flagged linkage gap — forensic domain precedes patching local shipment rows.",
};

function integrityFindingClassificationSurfaceHint(
  cat: LifecycleIntegrityFinding["category"]
): DerivedStateClassification {
  switch (cat) {
    case "FULFILLMENT":
    case "SHIPMENT":
    case "NOTIFICATION":
      return "authoritative";
    case "PAYMENT":
    case "REFUND":
    case "WEBHOOK":
      return "reconciliation_only";
    default:
      return "reconciliation_only";
  }
}

/** Summarize heuristic classification tags for aggregated integrity findings (counts only). */
export function countIntegritySurfaceClassifications(rows: LifecycleIntegrityFinding[]): Record<DerivedStateClassification, number> {
  const acc: Record<DerivedStateClassification, number> = {
    authoritative: 0,
    derived: 0,
    reconciliation_only: 0,
  };
  for (const row of rows) {
    acc[integrityFindingClassificationSurfaceHint(row.category)]++;
  }
  return acc;
}

/**
 * Map lifecycle integrity finding codes → explainability overlays (additive fields for dashboards).
 * Pure helper — safe to attach post-scan without changing detector semantics.
 */
export function authorityAugmentationForIntegrityFinding(f: Pick<LifecycleIntegrityFinding, "category" | "code">): {
  authorityDomain: LifecycleAuthorityDomain;
  authorityNote: string;
} {
  const authorityDomain = CATEGORY_TO_DOMAIN[f.category];
  const authorityNote =
    CODE_SPECIFIC_NOTES[f.code] ??
    ({
      PAYMENT:
        "PSP-aligned payment mirrors dominate — correlate local rows with PSP dashboards prior to widening derived aggregates.",
      FULFILLMENT:
        "Fulfillment groups own readiness states that later roll into coarse commerce posture.",
      REFUND:
        "Operational refund choreography must align PaymentRecord linkage before asserting PSP-backed refunds.",
      SHIPMENT:
        "Shipment rows mirror carrier/Shippo — prefer upstream tooling when projections disagree.",
      NOTIFICATION:
        "Notification backlog overlays financial truth — treat as orchestration backlog only.",
      WEBHOOK:
        "Inbound receipt / replay overlays can repair mirrors — audited super-admin workflows only.",
    }[f.category] as string);

  return { authorityDomain, authorityNote };
}

/** Attach additive authority overlays to cloned findings rows. */
export function withLifecycleIntegrityAuthorityOverlay(
  rows: LifecycleIntegrityFinding[]
): LifecycleIntegrityFinding[] {
  return rows.map((row) => {
    const overlay = authorityAugmentationForIntegrityFinding(row);
    return {
      ...row,
      authorityDomain: overlay.authorityDomain,
      authorityNote: overlay.authorityNote,
    };
  });
}
