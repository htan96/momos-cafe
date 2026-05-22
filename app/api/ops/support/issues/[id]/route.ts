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

  const nextStatus = typeof body.status === "string" ? body.status.trim().toUpperCase() : "";
  if (nextStatus) {
    const allowed = Object.values(OperationalSupportIssueStatus) as string[];
    if (!allowed.includes(nextStatus)) return bad("invalid_status");
    merged.status = nextStatus as OperationalSupportIssueStatus;
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

  const updated = await prisma.operationalSupportIssue.update({
    where: { id: issue.id },
    data: merged,
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
    metadata: { merged: merged as Record<string, unknown>, priorStatus: issue.status },
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
    },
    source: { handler: "PATCH api/ops/support/issues/[id]" },
    sourceTag: "ops.support",
  });

  return NextResponse.json({ issue: updated });
}
