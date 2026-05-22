/**
 * Shared interpretation of dashboard-style severity strings surfaced on Super Admin operations pages.
 * Matches ordinal labels like {@link OperationalActivitySeverity} subsets and integrity rollups.
 */
export function operationalDashboardSeverityIsEscalated(severity: string | null | undefined): boolean {
  const u = severity?.trim().toUpperCase();
  return u === "HIGH" || u === "CRITICAL";
}
