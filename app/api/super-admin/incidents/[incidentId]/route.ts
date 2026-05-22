import { OperationalActivitySeverity, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";
import {
  OPERATIONAL_INCIDENT_STATUSES,
  isAllowedIncidentStatusTransition,
  normalizeIncidentAssignee,
  type OperationalIncidentStatus,
} from "@/lib/incidents/incidentLifecycle";
import { mergeIncidentOperatorMetadata } from "@/lib/incidents/mergeIncidentOperatorMetadata";
import { prisma } from "@/lib/prisma";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";

const INCIDENT_ROUTE_ID_RE = /^[a-z0-9_-]{10,160}$/i;

type RouteContext = { params: Promise<{ incidentId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCognitoServerSession();
  if (!user?.groups || !isSuperAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const actorLabel = user.email ?? user.username ?? user.sub;

  const { incidentId } = await context.params;
  const id = incidentId?.trim();
  if (!id || !INCIDENT_ROUTE_ID_RE.test(id)) {
    return NextResponse.json({ error: "invalid_incident_id" }, { status: 400 });
  }

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!parsed || typeof parsed !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const body = parsed as { status?: unknown; assignee?: unknown; note?: unknown };

  const nextIncoming =
    typeof body.status === "string" && body.status.trim().length ?
      body.status.trim().toLowerCase()
    : undefined;

  if (nextIncoming !== undefined && !(OPERATIONAL_INCIDENT_STATUSES as readonly string[]).includes(nextIncoming)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const assigneeProvided = Object.prototype.hasOwnProperty.call(body, "assignee");
  if (assigneeProvided && body.assignee !== null && typeof body.assignee !== "string") {
    return NextResponse.json({ error: "invalid_assignee" }, { status: 400 });
  }

  const noteProvided = Object.prototype.hasOwnProperty.call(body, "note");
  if (noteProvided && typeof body.note !== "string") {
    return NextResponse.json({ error: "invalid_note" }, { status: 400 });
  }

  const noteTrim = typeof body.note === "string" ? body.note.trim() : "";

  if (nextIncoming === undefined && !assigneeProvided && !noteProvided) {
    return NextResponse.json({ error: "empty_patch", message: "Nothing to patch." }, { status: 400 });
  }

  if (noteProvided && noteTrim.length > 0 && noteTrim.length < 4) {
    return NextResponse.json({ error: "note_too_short", message: "Notes need at least four characters." }, {
      status: 400,
    });
  }

  const row = await prisma.operationalIncident.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "not_found", code: "NOT_FOUND" }, { status: 404 });
  }

  /** ---- Resolved rows: append-only metadata (assignee + timeline notes) ---- */
  if (row.status === "resolved") {
    if (nextIncoming !== undefined && nextIncoming !== "resolved") {
      return NextResponse.json(
        {
          error: "immutable_incident_status",
          message: "Incident is already resolved — status cannot regress here.",
        },
        { status: 409 }
      );
    }

    if (!assigneeProvided && !(noteProvided && noteTrim.length >= 4)) {
      return NextResponse.json(
        {
          error: "no_allowed_patch",
          message: "Provide `assignee` or a substantive `note`.",
        },
        { status: 400 }
      );
    }

    let metadata = row.metadata ?? {};
    if (assigneeProvided) {
      const token =
        body.assignee === null ? "" : normalizeIncidentAssignee(body.assignee as string) ?? "";
      metadata = mergeIncidentOperatorMetadata({ current: metadata, assignee: token });
    }

    if (noteProvided && noteTrim.length >= 4) {
      metadata = mergeIncidentOperatorMetadata({
        current: metadata,
        timelineEntry: {
          at: new Date().toISOString(),
          actorId: user.sub,
          note: noteTrim,
          status: row.status,
        },
      });
    }

    const updated = await prisma.operationalIncident.update({
      where: { id },
      data: {
        metadata,
        updatedAt: new Date(),
      },
    });

    await recordGovernanceAuditEntry({
      actionType: "OPERATIONAL_INCIDENT_UPDATED",
      category: "operations",
      actorId: user.sub,
      actorName: actorLabel,
      actorRole: "super_admin",
      targetType: "operational_incident",
      targetId: id,
      targetName: row.type,
      description: "Operational incident ledger metadata patched (already resolved)",
      metadata: {
        resolved: true,
        assigneeTouched: assigneeProvided,
        noteTouched: Boolean(noteProvided && noteTrim.length >= 4),
      },
    });

    void emitPlatformEvent({
      category: "INCIDENT_EVENT",
      subtype: PLATFORM_EVENT_SUBTYPE.INCIDENT_OPERATOR_UPDATED,
      lifecycle: "succeeded",
      severity: OperationalActivitySeverity.info,
      actorType: "super_admin",
      actorId: user.sub,
      actorName: actorLabel,
      message: `Incident ${id.slice(0, 10)} resolved-row metadata patch`,
      entities: { incidentId: id },
      detail: { phase: "post_resolve_patch" },
      sourceTag: "api.super-admin.incidents.patch",
      skipIncidentEvaluation: true,
    });

    return NextResponse.json({ ok: true, incident: updated });
  }

  /** ---- Open lifecycle edits ---- */

  const nextStatus: OperationalIncidentStatus =
    typeof nextIncoming === "string"
      ?
        (nextIncoming as OperationalIncidentStatus)
      : (row.status as OperationalIncidentStatus);

  const movesStatus =
    typeof nextIncoming === "string" && row.status !== nextIncoming;

  if (movesStatus) {
    if (!isAllowedIncidentStatusTransition(row.status, nextStatus)) {
      return NextResponse.json(
        { error: "invalid_transition", message: `${row.status} → ${nextStatus}` },
        { status: 400 }
      );
    }
  }

  const closingIncident = movesStatus && nextStatus === "resolved";

  if (closingIncident && (!noteProvided || noteTrim.length < 4)) {
    return NextResponse.json(
      {
        error: "resolution_note_required",
        message: "Resolving requires a closing note with at least four characters.",
      },
      { status: 400 }
    );
  }

  let metadataNext = row.metadata ?? {};
  if (assigneeProvided) {
    const token =
      body.assignee === null ? "" : normalizeIncidentAssignee(body.assignee as string) ?? "";
    metadataNext = mergeIncidentOperatorMetadata({ current: metadataNext, assignee: token });
  }

  if (
    noteProvided &&
    noteTrim.length >= 4 &&
    (!closingIncident)
  ) {
    metadataNext = mergeIncidentOperatorMetadata({
      current: metadataNext,
      timelineEntry: {
        at: new Date().toISOString(),
        actorId: user.sub,
        note: noteTrim,
        status: movesStatus ?
          nextStatus
        : (row.status),
      },
    });
  }

  let resolutionNotes = row.resolutionNotes;
  let resolvedAt: Date | undefined;

  if (closingIncident) {
    const closingText = noteTrim;
    resolutionNotes =
      row.resolutionNotes?.trim()?.length ?
        `${row.resolutionNotes!.trim()}\n---\n${closingText}`
      : closingText;
    resolvedAt = new Date();
  } else if (movesStatus && nextStatus !== "resolved") {
    resolvedAt = undefined;
  }

  const statusUpdate = movesStatus ?
    ({ status: nextStatus } satisfies { status: string })
    : undefined;

  const dataPayload: Parameters<typeof prisma.operationalIncident.update>[0]["data"] = {
    metadata: metadataNext,
    updatedAt: new Date(),
  };

  if (statusUpdate) {
    dataPayload.status = statusUpdate.status;
  }

  if (closingIncident && resolutionNotes !== undefined && resolvedAt) {
    dataPayload.resolutionNotes = resolutionNotes ?? undefined;
    dataPayload.resolvedAt = resolvedAt;
  }

  if (movesStatus && nextStatus !== "resolved") {
    dataPayload.resolvedAt = null;
  }

  const updated = await prisma.operationalIncident.update({
    where: { id },
    data: dataPayload,
  });

  await recordGovernanceAuditEntry({
    actionType: "OPERATIONAL_INCIDENT_UPDATED",
    category: "operations",
    actorId: user.sub,
    actorName: actorLabel,
    actorRole: "super_admin",
    targetType: "operational_incident",
    targetId: id,
    targetName: row.type,
    description: movesStatus
      ? `${row.status} → ${updated.status}`
      : "Operational incident operator metadata PATCH",
    metadata: {
      beforeStatus: row.status,
      afterStatus: updated.status,
      toggledResolution: closingIncident,
    },
  });

  void emitPlatformEvent({
    category: "INCIDENT_EVENT",
    subtype: PLATFORM_EVENT_SUBTYPE.INCIDENT_OPERATOR_UPDATED,
    lifecycle: "succeeded",
    severity: OperationalActivitySeverity.info,
    actorType: "super_admin",
    actorId: user.sub,
    actorName: actorLabel,
    message:
      closingIncident ?
        `Incident resolved (${row.type})`
      : movesStatus ?
        `${row.status} → ${updated.status}`
      : "Incident metadata updated",
    entities: { incidentId: id },
    detail: { beforeStatus: row.status, afterStatus: updated.status },
    sourceTag: "api.super-admin.incidents.patch",
    skipIncidentEvaluation: true,
  });

  return NextResponse.json({ ok: true, incident: updated });
}
