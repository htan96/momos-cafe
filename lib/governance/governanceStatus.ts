/** Customer-facing capability operational status (status-first governance UI). */
export type GovernanceOperationalStatus = "ACTIVE" | "BLOCKED" | "DISABLED" | "DEGRADED";

export type GovernanceEnforcementLayer =
  | "governance_kill_switch"
  | "maintenance_system"
  | "feature_flag"
  | "authentication_system"
  | "database_configuration";

export const ENFORCEMENT_LAYER_LABELS: Record<GovernanceEnforcementLayer, string> = {
  governance_kill_switch: "Governance kill switch",
  maintenance_system: "Maintenance system",
  feature_flag: "Feature flag",
  authentication_system: "Authentication system",
  database_configuration: "Database configuration",
};

export type GovernanceRiskLevel = "low" | "medium" | "high";

export function statusPillVariantForOperationalStatus(
  status: GovernanceOperationalStatus
): "ok" | "down" | "degraded" | "neutral" | "warning" | "critical" {
  switch (status) {
    case "ACTIVE":
      return "ok";
    case "BLOCKED":
      return "critical";
    case "DISABLED":
      return "down";
    case "DEGRADED":
      return "degraded";
  }
}
