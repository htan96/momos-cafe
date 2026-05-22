/** Persisted OperationalIncident.status values (see prisma model). */
export const OPERATIONAL_INCIDENT_STATUSES = [
  "active",
  "investigating",
  "monitoring",
  "resolved",
] as const;

export type OperationalIncidentStatus = (typeof OPERATIONAL_INCIDENT_STATUSES)[number];

const ALLOWED: Record<
  OperationalIncidentStatus,
  ReadonlySet<OperationalIncidentStatus> | undefined
> = {
  active: new Set(["investigating", "monitoring"]),
  investigating: new Set(["monitoring", "resolved"]),
  monitoring: new Set(["resolved"]),
  resolved: undefined,
};

/**
 * Validates `current → next` transitions for operator-driven lifecycle edits.
 */
export function isAllowedIncidentStatusTransition(
  current: string,
  next: string
): next is OperationalIncidentStatus {
  if (current === next) return true;
  const c = current as OperationalIncidentStatus;
  const n = next as OperationalIncidentStatus;
  if (!OPERATIONAL_INCIDENT_STATUSES.includes(c)) return false;
  if (!OPERATIONAL_INCIDENT_STATUSES.includes(n)) return false;
  if (n === "resolved" && current === "active") return false;
  return ALLOWED[c]?.has(n) ?? false;
}

export function normalizeIncidentAssignee(assignee?: string | null): string | undefined {
  if (assignee === undefined || assignee === null) return undefined;
  const t = assignee.trim().slice(0, 320);
  return t.length ? t : "";
}
