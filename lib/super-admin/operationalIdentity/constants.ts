/**
 * Max Cognito **`ListUsers`** records examined (across pagination) per operational-identity search.
 * Hard stop for safety — large pools enumerate slowly; substring matching is intentionally bounded.
 *
 * Tweaking: raise only with awareness of **`cognito-idp:ListUsers`** limits + latency.
 */
export const OPERATIONAL_IDENTITY_COGNITO_SCAN_MAX_USERS = 420;

/** Max rows returned from identity search (customers + optional Cognito adjunct). */
export const OPERATIONAL_IDENTITY_SEARCH_LIMIT = 18;

/** Minimum query length — reduces noisy scans / Cognito lookups. */
export const OPERATIONAL_IDENTITY_SEARCH_MIN_Q = 3;

/** Notifications: count only payload paths we can indexCheaply approximate; capped for honesty. */
export const OPERATIONAL_IDENTITY_NOTIFICATION_COUNT_CAP = 10_000;

/** Recent operational activity excerpt (merged timeline). */
export const OPERATIONAL_IDENTITY_TIMELINE_TAKE = 18;
