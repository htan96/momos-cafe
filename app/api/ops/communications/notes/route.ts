import { NextResponse } from "next/server";
import { OperationalActivitySeverity, OperationalCommunicationNoteKind } from "@prisma/client";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import { opsCan } from "@/lib/ops/permissions";
import { OPS_ENTITY_UUID_RE } from "@/lib/operations/operationalContextLinks";
import { looksLikeOperationalCuid } from "@/lib/ops/cuidLooksLike";
import { prisma } from "@/lib/prisma";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";

export const runtime = "nodejs";

const KIND_SET = new Set<string>(Object.values(OperationalCommunicationNoteKind));

function deny(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function canAuthorNote(role: import("@/lib/ops/types").OpsRole): boolean {
  return opsCan(role, "communications:write") || opsCan(role, "support:write");
}

export async function POST(req: Request) {
  const session = await getOpsSession();
  if (!session || !canAuthorNote(session.role)) {
    return deny("forbidden", 403);
  }

  let row: Record<string, unknown>;
  try {
    row = (await req.json()) as Record<string, unknown>;
  } catch {
    return deny("invalid_json");
  }

  const commerceOrderId =
    typeof row.commerceOrderId === "string" ? row.commerceOrderId.trim() || null : null;
  const customerId = typeof row.customerId === "string" ? row.customerId.trim() || null : null;
  const xor = (commerceOrderId ? 1 : 0) + (customerId ? 1 : 0);
  if (xor !== 1) {
    return deny("exactly_one_of_commerceOrderId_or_customerId_required");
  }

  if (commerceOrderId && !OPS_ENTITY_UUID_RE.test(commerceOrderId)) return deny("commerceOrderId_uuid_invalid");
  if (customerId && !OPS_ENTITY_UUID_RE.test(customerId)) return deny("customerId_uuid_invalid");

  const kindRaw = typeof row.kind === "string" ? row.kind.trim().toUpperCase() : "";
  if (!kindRaw || !KIND_SET.has(kindRaw)) {
    return deny("invalid_kind");
  }
  const kind = kindRaw as OperationalCommunicationNoteKind;

  const body = typeof row.body === "string" ? row.body.trim() : "";
  if (!body) return deny("body_required");

  let supportIssueId: string | null =
    typeof row.supportIssueId === "string" && row.supportIssueId.trim() ?
      row.supportIssueId.trim()
    : null;
  if (supportIssueId && !looksLikeOperationalCuid(supportIssueId)) {
    return deny("supportIssueId_invalid");
  }

  if (commerceOrderId) {
    const ord = await prisma.commerceOrder.findUnique({
      where: { id: commerceOrderId },
      select: { id: true, customerId: true },
    });
    if (!ord) return deny("commerce_order_not_found", 404);

    if (supportIssueId) {
      const issue = await prisma.operationalSupportIssue.findUnique({
        where: { id: supportIssueId },
        select: {
          id: true,
          commerceOrderId: true,
          customerId: true,
        },
      });
      if (!issue) return deny("support_issue_not_found", 404);

      const orderMatches = issue.commerceOrderId === commerceOrderId;
      const customerBridge =
        issue.commerceOrderId == null &&
        ord.customerId != null &&
        issue.customerId === ord.customerId;
      if (!orderMatches && !customerBridge) {
        return deny("support_issue_order_mismatch");
      }
    }
  } else if (customerId) {
    const cust = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!cust) return deny("customer_not_found", 404);

    if (supportIssueId) {
      const issue = await prisma.operationalSupportIssue.findUnique({
        where: { id: supportIssueId },
        select: { id: true, customerId: true },
      });
      if (!issue) return deny("support_issue_not_found", 404);
      if (issue.customerId && issue.customerId !== customerId) {
        return deny("support_issue_customer_mismatch");
      }
    }
  }

  const note = await prisma.operationalCommunicationNote.create({
    data: {
      commerceOrderId,
      customerId,
      supportIssueId,
      authorStaffSub: session.sub,
      kind,
      body,
    },
  });

  await recordGovernanceAuditEntry({
    actionType: "OPERATIONAL_COMMUNICATION_NOTE_CREATED",
    category: "operations",
    actorId: session.sub,
    actorName: session.email,
    actorRole: session.roleBadge ?? "admin",
    targetType: "operational_communication_note",
    targetId: note.id,
    description: `Ops communication note (${note.kind})`,
    metadata: {
      commerceOrderId,
      customerId,
      supportIssueId,
      noteKind: note.kind,
    },
  });

  void emitPlatformEvent({
    category: commerceOrderId ? "ORDER_EVENT" : "SYSTEM_EVENT",
    subtype: PLATFORM_EVENT_SUBTYPE.COMMUNICATION_INTERNAL_NOTE_ADDED,
    lifecycle: "succeeded",
    severity: OperationalActivitySeverity.info,
    actorType: session.roleBadge === "super_admin" ? "super_admin" : "admin",
    actorId: session.sub,
    actorName: session.email,
    message:
      commerceOrderId ?
        `Internal communication note added (${note.kind}).`
      : `Customer-scoped communication note (${note.kind}).`,
    entities: {
      commerceOrderId: commerceOrderId ?? undefined,
      customerId: customerId ?? undefined,
    },
    detail: {
      operationalCommunicationNoteId: note.id,
      noteKind: note.kind,
      supportIssueId: supportIssueId ?? undefined,
      visibility: note.visibility,
    },
    source: { handler: "POST api/ops/communications/notes" },
    sourceTag: "ops.communications",
  });

  return NextResponse.json({ note });
}
