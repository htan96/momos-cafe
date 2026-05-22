/**
 * Centralized **operational timing** literals (staleness, lookbacks, leases, scanners).
 *
 * Prefer importing from `@/lib/operations/semantics` rather than duplicating literals. When a cyclic import blocks
 * a wiring change, duplicate **once** with a pointer comment to this file (see docs/architecture/operational-semantics.md).
 *
 * Retry **algorithms** live in processors/cron; this module only mirrors numeric budgets for documentation/UI alignment.
 */

/** Milliseconds per clock hour — used consistently for staleness horizons expressed in env/docs as hours. */
export const OPERATIONAL_MS_PER_HOUR = 60 * 60 * 1000;

/** Milliseconds per calendar day (24h wall-clock, not business-day aware). */
export const OPERATIONAL_MS_PER_DAY = 24 * OPERATIONAL_MS_PER_HOUR;

// ── Payment integrity (`/super-admin/operations/payment-integrity`) ─────────────────────────────

/**
 * Default hours for “stale pending payment shells / PSP rows”. Override with `PAYMENT_INTEGRITY_STALE_HOURS` (min 1).
 * Wired through {@link readPaymentIntegrityStaleHoursFromEnv} in `lib/super-admin/paymentIntegrity/queries.ts`.
 * @see `.env.example` PAYMENT_INTEGRITY_STALE_HOURS
 */
export const OPERATIONAL_PAYMENT_INTEGRITY_DEFAULT_STALE_HOURS = 24;

/**
 * Default payment-integrity “stale snapshot” horizon in ms (env-unset path only).
 * Effective production value: `readPaymentIntegrityStaleHoursFromEnv() * OPERATIONAL_MS_PER_HOUR`.
 */
export const OPERATIONAL_STALE_PAYMENT_SNAPSHOT_DEFAULT_MS =
  OPERATIONAL_PAYMENT_INTEGRITY_DEFAULT_STALE_HOURS * OPERATIONAL_MS_PER_HOUR;

/** Square orphan-payment webhook receipts: “received_at” cutoff for linkage checks in payment integrity. */
export const OPERATIONAL_PAYMENT_ORPHAN_RECEIPT_LOOKBACK_MS = 14 * OPERATIONAL_MS_PER_DAY;

/** Rows sampled for stale-payment lists in Postgres queries (caps UI payload size, not logical severity). */
export const OPERATIONAL_PAYMENT_STALE_SAMPLE_CAP = 50;

/**
 * Row-count bands for payment-integrity **UI** severity (INFO / WARNING / HIGH) — heuristic only, not financial truth.
 * Any positive count is ≥ WARNING; at or above this count elevates to HIGH.
 */
export const OPERATIONAL_PAYMENT_INTEGRITY_UI_COUNT_HIGH_THRESHOLD = 5;

// ── Operational safety dashboard (`loadOperationalSafetyDashboard`) ────────────────────────────

/**
 * Webhook `WebhookDeliveryReceipt` rollup horizon (Square/Shippo and related providers).
 * Mirrors safety dashboard copy: “failed (14d)”.
 */
export const OPERATIONAL_WEBHOOK_RECEIPT_ROLLUP_LOOKBACK_MS = 14 * OPERATIONAL_MS_PER_DAY;

/** “Stale” heuristic for orders stuck in `pending_payment` keyed on **`updated_at`**. */
export const OPERATIONAL_SAFETY_PENDING_PAYMENT_STALE_MS = 2 * OPERATIONAL_MS_PER_HOUR;

/** “Stale” heuristic for PSP rows stuck in pending — keyed on **`updated_at`**. */
export const OPERATIONAL_SAFETY_PAYMENT_RECORD_PENDING_STALE_MS = 2 * OPERATIONAL_MS_PER_HOUR;

/** Stuck-notification backlog heuristic: `processed_at` missing and `created_at` older than this window. */
export const OPERATIONAL_SAFETY_NOTIFICATION_BACKLOG_MS = 1 * OPERATIONAL_MS_PER_HOUR;

// ── Notifications — health UI buckets (`loadNotificationOperationalHealth`) ─────────────────

/** Pending rows created inside this window are treated “fresh backlog” buckets (under 1h). */
export const OPERATIONAL_NOTIFICATION_HEALTH_PENDING_FRESH_WINDOW_MS = 1 * OPERATIONAL_MS_PER_HOUR;

/** Typical “recent throughput” aggregation window when comparing notification rows. */
export const OPERATIONAL_NOTIFICATION_HEALTH_DAY_WINDOW_MS = 1 * OPERATIONAL_MS_PER_DAY;

/** Long-window signals (SES webhook receipts, coarse trends). */
export const OPERATIONAL_NOTIFICATION_HEALTH_THIRTY_DAY_WINDOW_MS = 30 * OPERATIONAL_MS_PER_DAY;

// ── Notification outbox — single-flight lease + retry budget ─────────────────────────────────

/**
 * Lease before another worker clears `started_processing_at` and retries.
 * Wired by `processNotificationOutbox` cron and {@link deriveNotificationLifecycleState}.
 */
export const OPERATIONAL_NOTIFICATION_OUTBOX_SINGLE_FLIGHT_LEASE_MS = 15 * 60 * 1000;

/**
 * Mirrors `DEFAULT_NOTIFICATION_RETRY_POLICY` in `lib/notifications/processorContract.ts` —
 * cron-driven outbox increments attempts; backoff is cooperative (not Redis locks).
 */
export const OPERATIONAL_NOTIFICATION_OUTBOX_RETRY_MAX_ATTEMPTS = 5;

/** Mirrors `DEFAULT_NOTIFICATION_RETRY_POLICY.baseDelayMs` (`processorContract.ts`). */
export const OPERATIONAL_NOTIFICATION_OUTBOX_RETRY_BASE_DELAY_MS = 60_000;

// ── Lifecycle / shipment scanners (`scanCommerceLifecycleIntegrity`) ─────────────────────────

/** Ignore very fresh mismatches — outbox can lag minutes legitimately before terminal-order drift scans. */
export const OPERATIONAL_LIFECYCLE_NOTIFICATION_TERMINAL_ORDER_MIN_AGE_MS = 4 * OPERATIONAL_MS_PER_HOUR;

/** Mid-transit Shipment statuses with `updated_at` older than this are “stale update” heuristic (INFO severity). */
export const OPERATIONAL_LIFECYCLE_SHIPMENT_MID_TRANSIT_STALE_MS = 72 * OPERATIONAL_MS_PER_HOUR;

/** Shippo webhook receipts with orphan error codes — rolling lookback inside scan. */
export const OPERATIONAL_LIFECYCLE_SHIPPO_ORPHAN_RECEIPT_WINDOW_MS = 7 * OPERATIONAL_MS_PER_DAY;

// ── Shippo webhooks ops visibility (`loadShippoWebhookOperationalVisibility`) ─────────────────

/** Trailing receipt window when summarizing inbound Shippo webhooks for super-admin tooling. */
export const OPERATIONAL_SHIPPO_WEBHOOK_OPS_VISIBILITY_MS = 72 * OPERATIONAL_MS_PER_HOUR;

// ── Ops / live activity dashboards (`opsLoadTodayQueues`, `queryLiveActivitySnapshots`) ────────

/** Fulfillment queues: “late or stuck” when paid/partial orders have `updated_at` older than this. */
export const OPERATIONAL_OPS_FULFILLMENT_GROUP_STALE_ORDER_UPDATE_MS = 36 * OPERATIONAL_MS_PER_HOUR;
