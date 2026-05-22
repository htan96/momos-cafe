/**
 * Lightweight operator assignee surfaced from `OperationalIncident.metadata.incidentOperator.assignee`.
 */
export function readIncidentOperatorAssignee(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const m = metadata as Record<string, unknown>;
  const op = m.incidentOperator;
  if (!op || typeof op !== "object" || Array.isArray(op)) return "";
  const assignee = (op as Record<string, unknown>).assignee;
  return typeof assignee === "string" && assignee.trim() ? assignee.trim() : "";
}
