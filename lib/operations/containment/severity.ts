import type { ContainmentRecommendation, ContainmentSeverity } from "./types";

const SEVERITY_RANK: Record<ContainmentSeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  WARNING: 2,
  INFO: 1,
};

/** Sorted for UI: severity desc, then kind for stable rendering. */
export function buildContainmentEscalationSummary(
  recommendations: ContainmentRecommendation[]
): ContainmentRecommendation[] {
  return [...recommendations].sort((a, b) => {
    const dr = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (dr !== 0) return dr;
    return a.kind.localeCompare(b.kind);
  });
}
