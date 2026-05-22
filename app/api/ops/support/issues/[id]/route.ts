import { NextResponse } from "next/server";
import { OperationalActivitySeverity, OperationalSupportIssueStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import { opsCan } from "@/lib/ops/permissions";
import { looksLikeOperationalCuid } from "@/lib/ops/cuidLooksLike";
import { prisma } from "@/lib/prisma";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";
import { legalSupportTransition } from "@/lib/operations/support/legalSupportTransition";
import {
  appendOperationalStateTransition,
  OPERATIONAL_STATE_TRANSITION_DOMAIN,
} from "@/lib/operations/transitions/appendOperationalStateTransition";

export const runtime = "nodejs";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getOpsSession();
  if (!session || !opsCan(session.role, "support:write")) {
    return bad("forbidden", 403);
  }

  const { id } = await ctx.params;
  if (!looksLikeOperationalCuid(id)) return bad("invalid_id");

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return bad("invalid_json");
  }

  const issue = await prisma.operationalSupportIssue.findUnique({ where: { id } });
  if (!issue) return bad("not_found", 404);

  const merged: Prisma.OperationalSupportIssueUpdateInput = {};

  let nextParsedStatus: OperationalSupportIssueStatus | undefined;
  const nextStatusRaw = typeof body.status === "string" ? body.status.trim().toUpperCase() : "";
  if (nextStatusRaw) {
    const allowed = Object.values(OperationalSupportIssueStatus) as string[];
    if (!allowed.includes(nextStatusRaw)) return bad("invalid_status");
    nextParsedStatus = nextStatusRaw as OperationalSupportIssueStatus;
    merged.status = nextParsedStatus;
  }

  if (typeof body.assignedToStaffSub === "string") {
    merged.assignedToStaffSub = body.assignedToStaffSub.trim() || null;
  }

  if (typeof body.title === "string" && body.title.trim()) merged.title = body.title.trim();

  if (typeof body.summary === "string") merged.summary = body.summary.trim() || null;

  if (typeof body.resolutionNotes === "string") {
    const next = body.resolutionNotes.trim();
    if (next.length) merged.resolutionNotes = next;
  }

  if (typeof body.resolutionNotesAppend === "string") {
    const bit = body.resolutionNotesAppend.trim();
    if (bit.length) {
      const stamp = new Date().toISOString();
      const suffix = `\n--- ${stamp} · ${session.email} (${session.sub}) ---\n${bit}`;
      merged.resolutionNotes = (issue.resolutionNotes ?? "") + suffix;
    }
  }

  if (Object.keys(merged).length === 0) {
    return bad("no_changes");
  }

  const transitionNoteRaw =
    typeof body.transitionNote === "string" ? body.transitionNote.trim() || null : null;

  /** Status change attempted */
  let statusChanged = false;
  let priorStatus = issue.status;
  let newStatusForAudit = issue.status;

  if (nextParsedStatus !== undefined && nextParsedStatus !== issue.status) {
    const gate = legalSupportTransition(issue.status, nextParsedStatus);
    if (!gate.ok) {
      return NextResponse.json({ error: "illegal_support_transition", reason: gate.reason }, { status: 422 });
    }
    statusChanged = true;
    newStatusForAudit = nextParsedStatus;
  }

  const actorType = session.roleBadge === "super_admin" ? ("super_admin" as const) : ("admin" as const);

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.operationalSupportIssue.update({
      where: { id: issue.id },
      data: merged,
    });

    if (statusChanged) {
      await appendOperationalStateTransition(tx, {
        domain: OPERATIONAL_STATE_TRANSITION_DOMAIN.SUPPORT,
        entityId: row.id,
        fromStatus: priorStatus,
        toStatus: newStatusForAudit,
        actorType,
        actorId: session.sub,
        actorName: session.email,
        sourceSystem: "ops_api",
        note: transitionNoteRaw,
        metadata: {
          patchedKeys: Object.keys(merged),
          commerceOrderId: row.commerceOrderId ?? undefined,
        },
      });
    }

    return row;
  });

  await recordGovernanceAuditEntry({
    actionType: "OPERATIONAL_SUPPORT_ISSUE_UPDATED",
    category: "operations",
    actorId: session.sub,
    actorName: session.email,
    actorRole: session.roleBadge ?? "admin",
    targetType: "operational_support_issue",
    targetId: updated.id,
    description: `Support issue patched (${String(merged.status ?? issue.status)})`,
    metadata: {
      merged: merged as Record<string, unknown>,
      priorStatus: issue.status,
      ...(statusChanged ? { supportTransition: { from: priorStatus, to: newStatusForAudit } } : {}),
    },
  });

  void emitPlatformEvent({
    category: "ORDER_EVENT",
    subtype: PLATFORM_EVENT_SUBTYPE.SUPPORT_ISSUE_UPDATED,
    lifecycle: "processing",
    severity: OperationalActivitySeverity.info,
    actorType: session.roleBadge === "super_admin" ? "super_admin" : "admin",
    actorId: session.sub,
    actorName: session.email,
    message: `Support issue updated — ${updated.title}`,
    entities: { commerceOrderId: updated.commerceOrderId ?? undefined },
    detail: {
      supportIssueId: updated.id,
      status: updated.status,
      patchedKeys: Object.keys(merged),
      ...(statusChanged ? { priorStatus: issue.status, newStatus: updated.status } : {}),
    },
    source: { handler: "PATCH api/ops/support/issues/[id]" },
    sourceTag: "ops.support",
  });

  return NextResponse.json({ issue: updated });
}
