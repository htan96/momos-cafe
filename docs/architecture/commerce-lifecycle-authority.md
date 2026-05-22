# Commerce lifecycle authority

This note complements [`operational-authority-boundaries.md`](./operational-authority-boundaries.md) (who may invoke HTTP surfaces) and [`operational-readiness.md`](./operational-readiness.md) (deployment vs data-plane checks). It focuses on **which domains own truth** for storefront commerce lifecycles and how derived surfaces should be interpreted during validation — **not** on RBAC.

Code mirrors: `lib/commerce/lifecycleAuthority/` (types, classifiers, static dependency graph, transition ownership hints).

---

## Authoritative domains (conceptual)

| Domain | What it owns | Typical failure mode |
| --- | --- | --- |
| **PSP payment** | Square (and similar) final money state; charge/refund outcomes | Webhook lag, idempotent replay drift |
| **Fulfillment operations** | `FulfillmentGroup` per-pipeline readiness (`KITCHEN` vs `RETAIL`) | Ops transitions ahead of settled payment shell |
| **Shipment / carrier** | Tracking + carrier milestones (often via Shippo ingestion) | Label purchase vs webhook orphan receipts |
| **Notification outbox** | `NotificationEvent` backlog / processing leases — orchestration, not money | Backlog on terminal orders |
| **Replay / recovery / audit** | Webhook receipts, super-admin replay tooling, governance audits — corrective overlays | Human-driven repair after incidents |
| **Derived workflow / UI** | Coarse `CommerceOrder.status` rollups, customer-facing summaries | Aggregate ahead of subgraph agreement |

---

## Source-of-truth vs derived (per entity)

| Entity / surface | Authoritative for | Derived / reconciled | Notes |
| --- | --- | --- | --- |
| **`CommerceOrder`** (`commerce_orders.status`, totals) | Platform identity + pricing snapshot for the shell | **Coarse `status` is a derived aggregate** informed by PSP + fulfillment subgraphs | Treat drift scanners as **reconciliation signals**, not automatic heal triggers. |
| **`PaymentRecord`** | Local persistence of payment attempts/capture workflow | **Mirror of PSP** once `squarePaymentId` / statuses echo; reconciled operationally vs Square Dashboard | PSP is extra-DB truth; rows are authoritative for automation **only when healthy**. |
| **`FulfillmentGroup`** | Per-group operational lifecycle (`pipeline` + `status`) | Rollup into coarse order status | Validators should prefer group rows over aggregate copy when they disagree. |
| **`Shipment`** | Local projection of carrier/Shippo tracking | Mirror of carrier/Shippo | Advanced shipment rows without tracking may be **pre-label** or **ingest lag** — heuristic only. |
| **Refund paths** (`OperationalRefundCase` + PSP refunds) | Support workflow + eventual PSP refund artifacts | Linkage between case ↔ `PaymentRecord` ↔ order is **reconciliation-critical** | Do not “fix” money by editing aggregates alone. |
| **`NotificationEvent` / outbox** | Orchestration queue state (`processedAt`, leases) | Not financial or carrier truth | Pending rows on terminal orders may be benign (paused workers) or backlog — context dependent. |

---

## Static dependency graph (explainability)

Directed edges mean: **upstream domain constrains or feeds** operational decisions about the downstream projection. Edges live in code as **`LIFECYCLE_AUTHORITY_DEPENDENCY_EDGES`** (`lib/commerce/lifecycleAuthority/lifecycleAuthorityGraph.ts`). They intentionally do **not** enforce runtime orchestration — they document intent for builders and operators.

---

## Transition ownership hints

Fulfillment pipelines and coarse commerce-order transitions reuse **`validateFulfillmentTransition`** / **`validateOrderStatusTransition`** (`lib/commerce/orderLifecycle.ts`). **`describeCommerceOrderTransitionOwnership`** and **`describeFulfillmentTransitionOwnership`** (`lib/commerce/lifecycleAuthority/transitionOwnership.ts`) map legal edges to **`TransitionOwnershipHint`** rows for comments and ops tooling — not middleware.

---

## Non-goals

- Replacing PSP dashboards or carrier tooling as adjudicators.
- Auto-healing payment or shipment projections from integrity scans alone.
- Encoding RBAC — see **`operational-authority-boundaries.md`**.
