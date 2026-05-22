import type { Prisma } from "@prisma/client";

/** Nests lightweight operator fields inside `OperationalIncident.metadata` (no migrations). */

export type IncidentOperatorTimelineEntry = {
  at: string;
  actorId?: string | null;
  note?: string;
  status?: string | null;
};

export function mergeIncidentOperatorMetadata(params: {
  current: unknown;
  assignee?: string | null;
  timelineEntry?: IncidentOperatorTimelineEntry | null;
}): Prisma.JsonObject {
  const base =
    params.current && typeof params.current === "object" && !Array.isArray(params.current)
      ? { ...(params.current as Record<string, unknown>) }
      : {};
  const opRaw = base.incidentOperator;
  const op =
    typeof opRaw === "object" && opRaw && !Array.isArray(opRaw)
      ? { ...(opRaw as Record<string, unknown>) }
      : {};

  if (params.assignee !== undefined) {
    const t =
      typeof params.assignee === "string" ?
        params.assignee.trim().slice(0, 320)
      : "";
    if (!t.length) delete op.assignee;
    else op.assignee = t;
  }

  if (params.timelineEntry) {
    const existing = Array.isArray(op.timeline) ? [...op.timeline] : [];
    existing.push(params.timelineEntry);
    op.timeline = existing.slice(-40);
  }

  base.incidentOperator = op;
  return base as Prisma.JsonObject;
}
