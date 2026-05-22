import { prisma } from "@/lib/prisma";
import {
  mapActivityRowsToCustomerTimeline,
  operationalActivityForCustomerTimelineWhere,
  REFUND_CASE_CUSTOMER_LABEL,
  SUPPORT_ISSUE_CUSTOMER_LABEL,
  type CustomerOperationalTimelineEventDto,
} from "@/lib/account/customerOrderOperationalPresentation";
import { accountOrderInclude } from "@/lib/account/dashboardData";
import {
  loadCustomerOrderCommunications,
  type CustomerOrderCommunicationRowDto,
} from "@/lib/account/loadCustomerOrderCommunications";
import { OPS_ENTITY_UUID_RE } from "@/lib/operations/operationalContextLinks";
import type { OperationalActivityEvent, OperationalRefundCase, OperationalSupportIssue, Prisma } from "@prisma/client";

const loadCustomerOperationalOrderDetailInclude = {
  ...accountOrderInclude,
  operationalSupportIssues: {
    orderBy: { createdAt: "desc" as const },
    take: 20,
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      status: true,
      title: true,
    },
  },
  operationalRefundCases: {
    orderBy: { createdAt: "desc" as const },
    take: 20,
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      status: true,
      amountCents: true,
      reason: true,
    },
  },
} satisfies Prisma.CommerceOrderInclude;

export type LoadedCustomerOperationalOrder = Prisma.CommerceOrderGetPayload<{
  include: typeof loadCustomerOperationalOrderDetailInclude;
}>;

export type CustomerSanitizedSupportIssue = Pick<
  OperationalSupportIssue,
  "id" | "createdAt" | "updatedAt" | "status" | "title"
> & { statusLabel: string };

export type CustomerSanitizedRefundCase = Pick<
  OperationalRefundCase,
  "id" | "createdAt" | "updatedAt" | "status" | "amountCents" | "reason"
> & { statusLabel: string };

export type LoadedCustomerOperationalOrderDetail = {
  order: LoadedCustomerOperationalOrder;
  operationalActivity: CustomerOperationalTimelineEventDto[];
  /** Raw rows backing `operationalActivity` + shipment-scoped derivation (carrier milestones). */
  operationalActivityRecords: OperationalActivityEvent[];
  communications: CustomerOrderCommunicationRowDto[];
};

function sanitizeSupportRow(
  row: Pick<OperationalSupportIssue, "id" | "createdAt" | "updatedAt" | "status" | "title">
): CustomerSanitizedSupportIssue {
  return {
    ...row,
    statusLabel: SUPPORT_ISSUE_CUSTOMER_LABEL[row.status],
  };
}

function sanitizeRefundRow(
  row: Pick<OperationalRefundCase, "id" | "createdAt" | "updatedAt" | "status" | "amountCents" | "reason">
): CustomerSanitizedRefundCase {
  return {
    ...row,
    statusLabel: REFUND_CASE_CUSTOMER_LABEL[row.status],
  };
}

/**
 * One server round-trip for account order detail operational truth (order graph + activity + comms).
 */
export async function loadCustomerOperationalOrderDetail(
  customerRowId: string,
  orderId: string
): Promise<LoadedCustomerOperationalOrderDetail | null> {
  if (!OPS_ENTITY_UUID_RE.test(orderId)) return null;

  const [order, activityRows, communications] = await Promise.all([
    prisma.commerceOrder.findFirst({
      where: { id: orderId, customerId: customerRowId, status: { not: "draft" } },
      include: loadCustomerOperationalOrderDetailInclude,
    }),
    prisma.operationalActivityEvent.findMany({
      where: operationalActivityForCustomerTimelineWhere(orderId),
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    loadCustomerOrderCommunications(orderId),
  ]);

  if (!order) return null;

  return {
    order,
    operationalActivity: mapActivityRowsToCustomerTimeline(activityRows),
    operationalActivityRecords: activityRows,
    communications,
  };
}

export function listCustomerSupportIssuesForOrder(
  order: Pick<LoadedCustomerOperationalOrder, "operationalSupportIssues">
): CustomerSanitizedSupportIssue[] {
  return order.operationalSupportIssues.map(sanitizeSupportRow);
}

export function listCustomerRefundCasesForOrder(
  order: Pick<LoadedCustomerOperationalOrder, "operationalRefundCases">
): CustomerSanitizedRefundCase[] {
  return order.operationalRefundCases.map(sanitizeRefundRow);
}
