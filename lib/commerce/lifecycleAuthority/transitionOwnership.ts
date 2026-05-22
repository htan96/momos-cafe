import type { FulfillmentPipeline } from "@/types/commerce";
import {
  COMMERCE_ORDER_STATUSES,
  RETAIL_FULFILLMENT_STATUSES,
  KITCHEN_FULFILLMENT_STATUSES,
  type CommerceOrderStatus,
  type FulfillmentGroupStatus,
  type KitchenFulfillmentStatus,
  type RetailFulfillmentStatus,
  validateFulfillmentTransition,
  validateOrderStatusTransition,
} from "@/lib/commerce/orderLifecycle";

import type { TransitionOwnershipHint } from "./types";

/**
 * Commerce order aggregates (`CommerceOrder.status` from `COMMERCE_ORDER_STATUSES`).
 *
 * Ownership model (explainability-only):
 * - **draft → pending_payment / cancelled**: storefront / checkout shells → `derived_workflow_ui` with PSP soon pending.
 * - **pending_payment → paid / cancelled**: transitions should follow PSP reconcile or trusted internal completion (`psp_payment`).
 * - **paid / partially_fulfilled → fulfilled / cancelled**: kitchen/ops + fulfillment subgraph drive truth; coarse status is summarized → `derived_workflow_ui`, **constrained by** `fulfillment` + `psp_payment`.
 */

const ORDER_TRANSITION_HINTS: Partial<Record<string, TransitionOwnershipHint>> = {
  "draft→pending_payment": {
    primaryDomain: "derived_workflow_ui",
    contributingDomains: ["psp_payment"],
    rationale: "Checkout progression creates shells; PSP capture still pending afterward.",
  },
  "draft→cancelled": {
    primaryDomain: "derived_workflow_ui",
    rationale: "Preorder abandonment clears the commerce shell without PSP settlement.",
  },
  "pending_payment→paid": {
    primaryDomain: "psp_payment",
    contributingDomains: ["derived_workflow_ui"],
    rationale: "Treat paid/settled posture as PSP-led; coarse order mirrors after reconcile.",
  },
  "pending_payment→cancelled": {
    primaryDomain: "psp_payment",
    contributingDomains: ["derived_workflow_ui"],
    rationale: "Unresolved PSP attempts expire or abort; clears pending shell cooperatively.",
  },
  "paid→partially_fulfilled": {
    primaryDomain: "fulfillment",
    contributingDomains: ["derived_workflow_ui", "psp_payment"],
    rationale: "Operational pipelines advance shipments/kitchen readiness; rollup follows groups.",
  },
  "paid→fulfilled": {
    primaryDomain: "fulfillment",
    contributingDomains: ["derived_workflow_ui"],
    rationale: "Single-stage completion when all pipelines already terminal locally.",
  },
  "paid→cancelled": {
    primaryDomain: "psp_payment",
    contributingDomains: ["operational_support_refund", "derived_workflow_ui"],
    rationale: "Cancellations after capture usually require PSP/coordinated refunds, not fulfillment alone.",
  },
  "partially_fulfilled→fulfilled": {
    primaryDomain: "fulfillment",
    contributingDomains: ["derived_workflow_ui"],
    rationale: "Group completion drives aggregate closure.",
  },
  "partially_fulfilled→cancelled": {
    primaryDomain: "psp_payment",
    contributingDomains: ["fulfillment", "operational_support_refund"],
    rationale: "Mid-flight cancellations need money + fulfillment alignment.",
  },
};

/**
 * Fulfillment group transitions (`FulfillmentGroup.status` typed via `FulfillmentGroupStatus`).
 *
 * **Kitchen pipeline:** `pending → kitchen_preparing → ready_for_pickup → completed|cancelled`
 * **Retail pipeline:** `pending → merch_processing → ready_for_pickup → shipped|completed|cancelled`
 *
 * Authoritative operators: **`fulfillment`** (ops routes, staff consoles). Derived rollups propagate to **`derived_workflow_ui`**.
 */

const FULFILLMENT_TRANSITION_BASE: TransitionOwnershipHint = {
  primaryDomain: "fulfillment",
  contributingDomains: ["psp_payment"],
  rationale: "Per-group statuses are fulfillment-owned; PSP settlement is a precondition in healthy storefront flows.",
};

function fulfillmentEdgeKey(pipeline: FulfillmentPipeline, from: FulfillmentGroupStatus, to: FulfillmentGroupStatus): string {
  return `${pipeline}:${from}->${to}`;
}

/** Map every legal fulfillment edge (from validated adjacency matrices) → ownership hints. */
function buildFulfillmentHintMap(): Map<string, TransitionOwnershipHint> {
  const map = new Map<string, TransitionOwnershipHint>();
  const ingest = (
    pipeline: FulfillmentPipeline,
    statuses: readonly (KitchenFulfillmentStatus | RetailFulfillmentStatus)[]
  ) => {
    for (const from of statuses) {
      if (from === "cancelled" || from === "completed") continue;
      for (const to of statuses) {
        if (from === to) continue;
        const gate = validateFulfillmentTransition(pipeline, from, to);
        if (!gate.ok) continue;
        const key = fulfillmentEdgeKey(pipeline, from as FulfillmentGroupStatus, to as FulfillmentGroupStatus);
        map.set(key, FULFILLMENT_TRANSITION_BASE);
      }
    }
  };
  ingest("KITCHEN", KITCHEN_FULFILLMENT_STATUSES as readonly KitchenFulfillmentStatus[]);
  ingest("RETAIL", RETAIL_FULFILLMENT_STATUSES as readonly RetailFulfillmentStatus[]);
  return map;
}

const FULFILLMENT_TRANSITION_HINT_BY_EDGE = buildFulfillmentHintMap();

/** Describe who should initiate a guarded commerce-order-level transition (`validateOrderStatusTransition`). */
export function describeCommerceOrderTransitionOwnership(from: CommerceOrderStatus, to: CommerceOrderStatus): TransitionOwnershipHint | null {
  const gate = validateOrderStatusTransition(from, to);
  if (!gate.ok) return null;
  const key = `${from}->${to}`;
  return ORDER_TRANSITION_HINTS[key] ?? null;
}

/** Enumerate known commerce transitions with hints (generation-time helper for dashboards). */
export function listCommerceOrderTransitionOwnershipHints(): Array<{
  from: CommerceOrderStatus;
  to: CommerceOrderStatus;
  hint: TransitionOwnershipHint;
}> {
  const out: Array<{ from: CommerceOrderStatus; to: CommerceOrderStatus; hint: TransitionOwnershipHint }> = [];
  for (const from of COMMERCE_ORDER_STATUSES) {
    for (const to of COMMERCE_ORDER_STATUSES) {
      if (from === to) continue;
      const gate = validateOrderStatusTransition(from, to);
      if (!gate.ok) continue;
      const hint = ORDER_TRANSITION_HINTS[`${from}->${to}`];
      if (!hint) continue;
      out.push({ from, to, hint });
    }
  }
  return out;
}

/** Fulfillment subgraph transitions — keyed by validated pipeline/from/to tuples. */
export function describeFulfillmentTransitionOwnership(
  pipeline: FulfillmentPipeline,
  from: FulfillmentGroupStatus,
  to: FulfillmentGroupStatus
): TransitionOwnershipHint | null {
  const gate = validateFulfillmentTransition(pipeline, from, to);
  if (!gate.ok) return null;
  const key = fulfillmentEdgeKey(pipeline, from, to);
  return FULFILLMENT_TRANSITION_HINT_BY_EDGE.get(key) ?? FULFILLMENT_TRANSITION_BASE;
}
