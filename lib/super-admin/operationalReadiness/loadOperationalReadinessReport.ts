import "server-only";

import type { OperationalSafetyAggregation, SeveritySummaryCounts } from "@/lib/super-admin/operationalSafety/loadOperationalSafetyDashboard";
import { loadOperationalSafetyDashboard } from "@/lib/super-admin/operationalSafety/loadOperationalSafetyDashboard";
import {
  scanEnvironmentOperationalIssues,
  type OperationalEnvIssue,
  type OperationalReadinessSeverity,
  worstOperationalReadinessSeverity,
} from "@/lib/super-admin/operationalReadiness/environmentOperationalValidation";

export type OperationalReadinessRuntimeSafetySlice = {
  generatedAt: string;
  summary: SeveritySummaryCounts;
  aggregation: OperationalSafetyAggregation;
};

export type OperationalReadinessGovernanceSnapshot = Awaited<
  ReturnType<typeof loadOperationalSafetyDashboard>
>["governance"];

export type OperationalReadinessReport = {
  generatedAt: string;
  envIssues: OperationalEnvIssue[];
  runtime: { fromSafety: OperationalReadinessRuntimeSafetySlice };
  governanceSnapshot: OperationalReadinessGovernanceSnapshot;
  overallSeverity: OperationalReadinessSeverity;
};

function worstSeverityFromSafetySummary(summary: SeveritySummaryCounts): OperationalReadinessSeverity | null {
  if (summary.CRITICAL > 0) return "CRITICAL";
  if (summary.HIGH > 0) return "HIGH";
  if (summary.WARNING > 0) return "WARNING";
  if (summary.INFO > 0) return "INFO";
  return null;
}

function mergeOverallSeverity(params: {
  envIssues: OperationalEnvIssue[];
  safetySummary: SeveritySummaryCounts;
}): OperationalReadinessSeverity {
  const fromEnv = params.envIssues.map((i) => i.severity);
  const fromSafety = worstSeverityFromSafetySummary(params.safetySummary);
  const merged = worstOperationalReadinessSeverity([
    ...fromEnv,
    ...(fromSafety ? [fromSafety] : []),
  ]);
  return merged ?? "INFO";
}

/**
 * Server-only consolidated readiness snapshot: env heuristic scan + Operational Safety dashboard slice.
 */
export async function loadOperationalReadinessReport(): Promise<OperationalReadinessReport> {
  const envIssues = scanEnvironmentOperationalIssues();
  const safety = await loadOperationalSafetyDashboard();

  const runtime: OperationalReadinessRuntimeSafetySlice = {
    generatedAt: safety.generatedAt,
    summary: safety.summary,
    aggregation: safety.aggregation,
  };

  const overallSeverity = mergeOverallSeverity({
    envIssues,
    safetySummary: safety.summary,
  });

  return {
    generatedAt: new Date().toISOString(),
    envIssues,
    runtime: { fromSafety: runtime },
    governanceSnapshot: safety.governance,
    overallSeverity,
  };
}
