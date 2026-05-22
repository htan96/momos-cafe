import type { LifecycleIntegritySeverity } from "@/lib/commerce/lifecycleIntegrity/types";
import { OPERATIONAL_PAYMENT_INTEGRITY_UI_COUNT_HIGH_THRESHOLD } from "@/lib/operations/semantics/constants";

/**
 * Four-tier ladder shared by lifecycle integrity, operational readiness env scan, operational safety rollup, and incidents.
 */
export type OperationalFourTierSeverity = LifecycleIntegritySeverity;

/** Ordinal rank for merging / sorting (higher = more severe). */
export const OPERATIONAL_FOUR_TIER_SEVERITY_RANK: Record<OperationalFourTierSeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  WARNING: 2,
  INFO: 1,
};

/** Super-admin readiness / env scan reuse the same ladder as lifecycle coordination reports. */
export type OperationalReadinessSeverity = OperationalFourTierSeverity;

export function operationalFourTierRank(severity: OperationalFourTierSeverity): number {
  return OPERATIONAL_FOUR_TIER_SEVERITY_RANK[severity];
}

export function worstOperationalFourTierSeverity(levels: OperationalFourTierSeverity[]): OperationalFourTierSeverity | null {
  let best: OperationalFourTierSeverity | null = null;
  let rank = 0;
  for (const l of levels) {
    const r = OPERATIONAL_FOUR_TIER_SEVERITY_RANK[l];
    if (r > rank) {
      rank = r;
      best = l;
    }
  }
  return best;
}

const FOUR_LOWER: Record<string, OperationalFourTierSeverity> = {
  critical: "CRITICAL",
  high: "HIGH",
  warning: "WARNING",
  info: "INFO",
};

/** Normalize fragmented lower-case inputs (queries, pasted CSVs) onto the canonical ladder when possible. */
export function normalizeOperationalFourTierSeverity(raw: string): OperationalFourTierSeverity | null {
  const t = raw.trim();
  if (t === "CRITICAL" || t === "HIGH" || t === "WARNING" || t === "INFO") return t;
  return FOUR_LOWER[t.toLowerCase()] ?? null;
}

// ── Payment integrity dashboard (three-tier UI) ────────────────────────────────────────────────

export type PaymentIntegrityUiSeverity = "INFO" | "WARNING" | "HIGH";

export const PAYMENT_INTEGRITY_UI_SEVERITY_RANK: Record<PaymentIntegrityUiSeverity, number> = {
  INFO: 1,
  WARNING: 2,
  HIGH: 3,
};

export function paymentIntegritySeverityFromCount(
  n: number,
  highThreshold = OPERATIONAL_PAYMENT_INTEGRITY_UI_COUNT_HIGH_THRESHOLD
): PaymentIntegrityUiSeverity {
  if (n <= 0) return "INFO";
  if (n >= highThreshold) return "HIGH";
  return "WARNING";
}
