import { NextResponse } from "next/server";
import type { OperationalFailureTriageState } from "@prisma/client";
import { OperationalActivitySeverity } from "@prisma/client";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { prisma } from "@/lib/prisma";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { isOperationalFailureType } from "@/lib/operations/failures/failureSubtypes";
import { queryOperationalFailureDetail } from "@/lib/operations/failures/queryOperationalFailures";

const TRIAGE_STATES: OperationalFailureTriageState[] = [
  "new",
  "acknowledged",
  "investigating",
  "resolved",
  "ignored",
];

type RouteContext = { params: Promise<{ eventId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCognitoServerSession();
  if (!user?.groups || !isSuperAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const { eventId } = await context.params;
  const event = await prisma.operationalActivityEvent.findUnique({ where: { id: eventId } });
  if (!event || !isOperationalFailureType(event.type)) {
    return NextResponse.json({ error: "not_found", code: "NOT_FOUND" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { state, assignedTo, notes } = body as {
    state?: unknown;
    assignedTo?: unknown;
    notes?: unknown;
  };

  if (typeof state !== "string" || !TRIAGE_STATES.includes(state as OperationalFailureTriageState)) {
    return NextResponse.json(
      { error: "invalid_state", message: `state must be one of: ${TRIAGE_STATES.join(", ")}` },
      { status: 400 }
    );
  }

  const nextState = state as OperationalFailureTriageState;
  const actorLabel = user.email ?? user.username ?? user.sub;

  const existing = await prisma.operationalFailureTriage.findUnique({
    where: { activityEventId: eventId },
  });

  await prisma.operationalFailureTriage.upsert({
    where: { activityEventId: eventId },
    create: {
      activityEventId: eventId,
      state: nextState,
      assignedTo: typeof assignedTo === "string" ? assignedTo.trim() || null : null,
      notes: typeof notes === "string" ? notes.trim() || null : null,
      updatedBy: actorLabel,
    },
    update: {
      state: nextState,
      ...(assignedTo !== undefined
        ? { assignedTo: typeof assignedTo === "string" ? assignedTo.trim() || null : null }
        : {}),
      ...(notes !== undefined ? { notes: typeof notes === "string" ? notes.trim() || null : null } : {}),
      updatedBy: actorLabel,
    },
  });

  await recordGovernanceAuditEntry({
    actionType: "OPERATIONAL_FAILURE_TRIAGE_UPDATED",
    category: "operations",
    actorId: user.sub,
    actorName: actorLabel,
    actorRole: "super_admin",
    targetType: "operational_failure",
    targetId: eventId,
    targetName: event.type,
    description: `Failure triage ${existing?.state ?? "untriaged"} → ${nextState}`,
    metadata: {
      previousState: existing?.state ?? null,
      nextState,
      failureType: event.type,
      assignedTo: typeof assignedTo === "string" ? assignedTo : existing?.assignedTo ?? null,
    },
  });

  void emitPlatformEvent({
    category: "SYSTEM_EVENT",
    subtype: "system.failure.triage_updated",
    lifecycle: "succeeded",
    severity: OperationalActivitySeverity.info,
    actorType: "super_admin",
    actorId: user.sub,
    actorName: actorLabel,
    message: `Failure triage updated to ${nextState} (${event.type})`,
    entities: {},
    detail: { eventId, previousState: existing?.state ?? null, nextState },
    sourceTag: "api.super-admin.operations.failures.triage",
    skipIncidentEvaluation: true,
  });

  const detail = await queryOperationalFailureDetail(eventId);
  return NextResponse.json({ ok: true, detail });
}
