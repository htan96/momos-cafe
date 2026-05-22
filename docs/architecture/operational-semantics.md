# Operational semantics (centralized)

This repo standardizes operator-facing staleness windows, leases, and severity ladders under `lib/operations/semantics/`.

The goal is **predictable dashboards**: the same literals power Postgres scanners, Operational Safety aggregates, readiness previews, and documentation — without rewriting processor algorithms.

See also:

- Operational readiness UX: [`operational-readiness.md`](./operational-readiness.md) (includes a live “effective thresholds preview” sourced from semantics).
- Runbooks referencing replay/backoff: [`../runbooks/README.md`](../runbooks/README.md).

## Stale windows and lookbacks

| Domain | Constant / accessor | Interpretation |
| ------ | ------------------ | ---------------- |
| Payment integrity staleness | `OPERATIONAL_PAYMENT_INTEGRITY_DEFAULT_STALE_HOURS` + **`readPaymentIntegrityStaleHoursFromEnv()`** (`PAYMENT_INTEGRITY_STALE_HOURS`, `.env.example`) | Orders / PSP rows stuck in pending beyond `updated_at` horizon. |
| Payment integrity orphans | `OPERATIONAL_PAYMENT_ORPHAN_RECEIPT_LOOKBACK_MS` | Square receipt linkage scan window. |
| Operational Safety — webhooks | `OPERATIONAL_WEBHOOK_RECEIPT_ROLLUP_LOOKBACK_MS` | Receipt rollup for failed / anomaly counts (“14d” in UI). |
| Operational Safety — payments | `OPERATIONAL_SAFETY_PENDING_PAYMENT_STALE_MS`, `OPERATIONAL_SAFETY_PAYMENT_RECORD_PENDING_STALE_MS` | Fast (2h) drift heuristics on `commerce_orders` / `payment_records`. |
| Operational Safety — notifications | `OPERATIONAL_SAFETY_NOTIFICATION_BACKLOG_MS` | Stuck backlog: `processed_at` null **and** `created_at` beyond 1h. |
| Notifications health buckets | `OPERATIONAL_NOTIFICATION_HEALTH_*_WINDOW_MS` | `<1h` / `24h` / `30d` backlog + reliability slicing. |
| Lifecycle scanner — shipments | `OPERATIONAL_LIFECYCLE_SHIPMENT_MID_TRANSIT_STALE_MS` | Mid-transit rows stale on `updated_at` (72h). |
| Lifecycle scanner — Shippo orphans | `OPERATIONAL_LIFECYCLE_SHIPPO_ORPHAN_RECEIPT_WINDOW_MS` | Receipt ORPHAN lookback inside drift scan (7d). |
| Lifecycle scanner — terminal orders | `OPERATIONAL_LIFECYCLE_NOTIFICATION_TERMINAL_ORDER_MIN_AGE_MS` | Ignore mismatches on very young terminal orders (4h). |
| Shippo ops visibility page | `OPERATIONAL_SHIPPO_WEBHOOK_OPS_VISIBILITY_MS` | Trailing window for webhook receipt listing (72h). |
| Ops / live dashboards | `OPERATIONAL_OPS_FULFILLMENT_GROUP_STALE_ORDER_UPDATE_MS` | Paid/partial queues when `order.updated_at` stale (36h). |

Grouped mirror for UI/metadata: [`thresholdGroups.ts`](../../lib/operations/semantics/thresholdGroups.ts).

## Processing leases (notification outbox)

| Constant | Role |
| -------- | ---- |
| `OPERATIONAL_NOTIFICATION_OUTBOX_SINGLE_FLIGHT_LEASE_MS` | Single-flight lease on `NotificationEvent.started_processing_at`. After TTL, cron may clear the lease and retry. Historically also exported as `STALE_NOTIFICATION_PROCESSING_LEASE_MS` from `lib/notifications/notificationOutboxConstants.ts`. |

Processors: `lib/notifications/processNotificationOutbox.ts` (do not change lease algorithm here — only centralize the **duration**).

## Retry semantics (definition-level)

| Surface | Meaning | Code anchor |
| ------- | ------- | ----------- |
| Notification outbox | Cooperative retries with persisted attempts; **max attempts** and **base delay** are policy constants. | `DEFAULT_NOTIFICATION_RETRY_POLICY` in `lib/notifications/processorContract.ts` — numeric mirrors in `OPERATIONAL_NOTIFICATION_OUTBOX_RETRY_*` |
| Webhook HTTP delivery | Fast request/response + idempotent reconcile in route handlers — **not** the same backoff as the outbox. | Live routes under `app/api/webhooks/*` |
| Cron / internal jobs | Batch selection + lease recovery — scheduling is infrastructure; semantics only document attempt/lease budgets. | e.g. `processNotificationOutbox` job wiring |

We **do not** redesign exponential backoff in this module; we only document and align numeric literals.

## Severity ladders

| Use case | Levels | Helpers |
| -------- | ------ | ------- |
| Lifecycle integrity findings, readiness env scan, safety summary | CRITICAL › HIGH › WARNING › INFO | `OPERATIONAL_FOUR_TIER_SEVERITY_RANK`, `worstOperationalFourTierSeverity`, `normalizeOperationalFourTierSeverity` |
| Payment integrity dashboard headers | INFO / WARNING / HIGH (row-count heuristic) | `paymentIntegritySeverityFromCount`, `PAYMENT_INTEGRITY_UI_SEVERITY_RANK` |

Aligns with [`LifecycleIntegritySeverity`](../../lib/commerce/lifecycleIntegrity/types.ts).

## Escalation philosophy

- Thresholds prioritize **consistency**: operators see the same numbers in loaders, dashboards, and docs.
- **Operator-led**: no pager integration — triage correlates Postgres drift with PSP dashboards and webhook receipts before corrective action.
- **Additive-first**: new constants default to documenting existing literals; widen coverage before tuning numerics.

`operationalEscalationGuidelines()` and [`describeOperationalSemanticsSnapshot()`](../../lib/operations/semantics/describeOperationalSemanticsSnapshot.ts) expose short copy for readiness UI.

## Out of scope (intentionally)

Incident spike windows (`PAYMENT_SPIKE_WINDOW_MS`, `OPERATIONAL_RULE_WINDOW_MS`) remain localized in [`incidentDetection.ts`](../../lib/operations/incidentDetection.ts) unless a future migration proves they drift with Operational Safety horizons.
