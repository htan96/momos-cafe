import type { OperationalActivitySeverity } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { buildCustomerOperationalActivityWhere } from "@/lib/accountManagement/buildCustomerOperationalActivityWhere";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { prisma } from "@/lib/prisma";

const IMPERSONATION_GOV_TYPES = new Set([
  "IMPERSONATION_STARTED",
  "IMPERSONATION_ENDED",
  "impersonation_start",
  "impersonation_end",
]);

/** Canonical grouping for diner-facing timelines (maps from persisted event / audit verbs). */
export type CustomerOperationalTimelineLane =
  | "auth"
  | "orders"
  | "payments"
  | "shipments"
  | "impersonation"
  | "admin"
  | "incident"
  | "catalog"
  | "presence"
  | "other";

export type CustomerOperationalTimelineItem = {
  id: string;
  kind: "operational_activity" | "governance_audit";
  at: Date;
  lane: CustomerOperationalTimelineLane;
  severity: OperationalActivitySeverity | "audit";
  headline: string;
  detail?: string | null;
  rawType?: string | null;
  source?: string | null;
};

function ledgerIdFromUnknown(meta: unknown): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const lid = (meta as Record<string, unknown>).ledgerId;
  return typeof lid === "string" && lid.trim() ? lid.trim() : null;
}

function governanceWhereForCustomer(args: {
  customerId: string;
  cognitoSub: string | null;
  emailTrim: string | null;
}): Prisma.GovernanceAuditEventWhereInput {
  const sub = args.cognitoSub?.trim();
  const mail = args.emailTrim?.trim();
  return {
    OR: [
      { metadata: { path: ["customerId"], equals: args.customerId } },
      ...(sub ? [{ targetId: sub }] : []),
      ...(mail ?
        [
          { targetName: { equals: mail, mode: Prisma.QueryMode.insensitive } },
          { metadata: { path: ["targetEmail"], equals: mail.toLowerCase() } },
        ]
      : []),
      ...(mail && mail.toLowerCase() !== mail ?
        [{ metadata: { path: ["targetEmail"], equals: mail } }]
      : []),
    ],
  };
}

export function classifyOperationalEventLane(type: string): CustomerOperationalTimelineLane {
  const t = type.trim().toLowerCase();
  if (t.includes("auth") && t.includes("login")) return "auth";
  if (
    type === PLATFORM_EVENT_SUBTYPE.AUTH_LOGIN_FAILED ||
    type === OPERATIONAL_EVENT_TYPES.AUTH_LOGIN ||
    type === OPERATIONAL_EVENT_TYPES.CUSTOMER_REGISTERED
  )
    return "auth";
  if (
    type === OPERATIONAL_EVENT_TYPES.PAYMENT_FAILED ||
    type === PLATFORM_EVENT_SUBTYPE.PAYMENT_WEBHOOK_PROCESSING_FAILED ||
    type === PLATFORM_EVENT_SUBTYPE.PAYMENT_REGISTER_FAILED ||
    type === PLATFORM_EVENT_SUBTYPE.PAYMENT_SQUARE_ORPHAN_WEBHOOK ||
    type === OPERATIONAL_EVENT_TYPES.PAYMENT_SUCCEEDED ||
    type === PLATFORM_EVENT_SUBTYPE.PAYMENT_SUPER_ADMIN_SQUARE_LOOKUP
  )
    return "payments";
  if (
    type === OPERATIONAL_EVENT_TYPES.ORDER_CREATED ||
    type.includes("order.") ||
    type.includes("checkout") ||
    type === PLATFORM_EVENT_SUBTYPE.ORDER_DRAFT_CREATE_FAILED
  )
    return "orders";
  if (
    type === OPERATIONAL_EVENT_TYPES.SHIPMENT_LABEL_CREATED ||
    type === PLATFORM_EVENT_SUBTYPE.SHIPMENT_QUOTE_FAILED ||
    type === PLATFORM_EVENT_SUBTYPE.SHIPMENT_LABEL_FAILED ||
    t.includes("shipment") ||
    t.includes("shipping")
  )
    return "shipments";
  if (
    type === OPERATIONAL_EVENT_TYPES.PRESENCE_IMPERSONATION_STARTED ||
    type === OPERATIONAL_EVENT_TYPES.PRESENCE_IMPERSONATION_ENDED ||
    t.includes("impersonation")
  )
    return "impersonation";
  if (
    type === OPERATIONAL_EVENT_TYPES.PLATFORM_FEATURE_TOGGLED ||
    type === OPERATIONAL_EVENT_TYPES.GOVERNANCE_CONTROL_UPDATED ||
    type === OPERATIONAL_EVENT_TYPES.MAINTENANCE_UPDATED ||
    type === OPERATIONAL_EVENT_TYPES.USER_ROLE_CHANGED ||
    type === OPERATIONAL_EVENT_TYPES.ADMIN_DEMOTED ||
    type === OPERATIONAL_EVENT_TYPES.ADMIN_PROMOTED
  )
    return "admin";
  if (
    type.includes("presence") ||
    type === OPERATIONAL_EVENT_TYPES.AUTH_LOGOUT ||
    t.includes("session")
  )
    return "presence";
  if (type.includes("menu") || type.includes("catalog")) return "catalog";
  if (type.includes("incident")) return "incident";
  return "other";
}

function classifyGovernanceLane(actionType: string): CustomerOperationalTimelineLane {
  if (IMPERSONATION_GOV_TYPES.has(actionType)) return "impersonation";
  const t = actionType.toUpperCase();
  if (t.includes("IMPERSONATION")) return "impersonation";
  return "admin";
}

/**
 * Operational + governance timeline for `/super-admin/users/customers/[id]`.
 * Drops duplicate impersonation bookkeeping (Governance `IMPERSONATION_*` vs ops `presence.impersonation_*`)
 * when both reference the same `metadata.ledgerId`.
 */
export async function queryCustomerOperationalTimeline(args: {
  customer: { id: string; email: string | null; externalAuthSubject: string | null };
  operationalTake?: number;
  governanceTake?: number;
}): Promise<CustomerOperationalTimelineItem[]> {
  const emailTrim = args.customer.email?.trim() ?? null;
  const cognitoSub = args.customer.externalAuthSubject?.trim() ?? null;
  const opTake = Math.min(250, Math.max(20, args.operationalTake ?? 120));
  const govTake = Math.min(120, Math.max(15, args.governanceTake ?? 40));

  const [operationalRows, governanceRows] = await Promise.all([
    prisma.operationalActivityEvent.findMany({
      where: buildCustomerOperationalActivityWhere(args.customer),
      orderBy: { createdAt: "desc" },
      take: opTake,
    }),
    prisma.governanceAuditEvent.findMany({
      where: governanceWhereForCustomer({
        customerId: args.customer.id,
        cognitoSub,
        emailTrim,
      }),
      orderBy: { createdAt: "desc" },
      take: govTake,
    }),
  ]);

  const items: CustomerOperationalTimelineItem[] = [];

  const impersonationLedgerIds = new Set<string>();
  for (const g of governanceRows) {
    const ledgerId = ledgerIdFromUnknown(g.metadata);
    const impersonationGov = IMPERSONATION_GOV_TYPES.has(g.actionType);

    const headline = g.description?.trim() ? g.description.trim() : g.actionType;
    items.push({
      id: `gov:${g.id}`,
      kind: "governance_audit",
      at: g.createdAt,
      lane: classifyGovernanceLane(g.actionType),
      severity: impersonationGov ? ("warning" as const) : ("audit" as const),
      headline,
      detail:
        impersonationGov && g.reason?.trim() ? g.reason.trim() : (g.reason?.trim() ?? g.targetName),
      rawType: g.actionType,
      source: null,
    });

    if (impersonationGov && ledgerId) impersonationLedgerIds.add(ledgerId);
  }

  for (const row of operationalRows) {
    const ledgerId = ledgerIdFromUnknown(row.metadata);
    if (
      ledgerId &&
      impersonationLedgerIds.has(ledgerId) &&
      (row.type === OPERATIONAL_EVENT_TYPES.PRESENCE_IMPERSONATION_STARTED ||
        row.type === OPERATIONAL_EVENT_TYPES.PRESENCE_IMPERSONATION_ENDED)
    ) {
      continue;
    }
    items.push({
      id: `op:${row.id}`,
      kind: "operational_activity",
      at: row.createdAt,
      lane: classifyOperationalEventLane(row.type),
      severity: row.severity,
      headline: row.message,
      detail: [row.actorType, row.source].filter(Boolean).join(" · ") || null,
      rawType: row.type,
      source: row.source,
    });
  }

  items.sort((a, b) => b.at.getTime() - a.at.getTime());

  const seenFingerprints = new Set<string>();
  const deduped: CustomerOperationalTimelineItem[] = [];
  for (const it of items) {
    const fp = `${it.at.toISOString()}|${it.kind}|${it.rawType ?? ""}|${it.headline}`;
    if (seenFingerprints.has(fp)) continue;
    seenFingerprints.add(fp);
    deduped.push(it);
  }

  return deduped;
}
