import { operationalIncidentWhereForCustomer } from "@/lib/operations/operationalContextLinks";
import { prisma } from "@/lib/prisma";
import { isValidCustomerUuid } from "@/lib/accountManagement/loadAccountMgmtDetail";
import { queryCustomerOperationalTimeline } from "@/lib/accountManagement/queryCustomerOperationalTimeline";



export async function loadSuperAdminCustomerDossier(customerId: string) {
  if (!isValidCustomerUuid(customerId)) return null;

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      email: true,
      phone: true,
      externalAuthSubject: true,
      squareCustomerId: true,
      authMetadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!customer) return null;

  const emailTrim = customer.email?.trim() ?? null;
  const cognitoSub = customer.externalAuthSubject?.trim() ?? null;

  const impersonationWhere =
    emailTrim || cognitoSub ?
      {
        OR: [
          ...(emailTrim ? [{ targetEmail: { equals: emailTrim, mode: "insensitive" as const } }] : []),
          ...(cognitoSub ? [{ targetSub: cognitoSub }] : []),
        ],
      }
    : null;

  const [
    orders,
    payments,
    shipments,
    impersonationLedger,
    presenceSessions,
    relatedIncidents,
    cateringInquiries,
    timelineRows,
    openIncidentCount,
  ] = await Promise.all([
    prisma.commerceOrder.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 35,
      select: {
        id: true,
        status: true,
        totalCents: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.paymentRecord.findMany({
      where: { order: { customerId } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        amountCents: true,
        createdAt: true,
        squarePaymentStatus: true,
        failureReason: true,
        orderId: true,
        order: { select: { id: true, status: true } },
      },
    }),
    prisma.shipment.findMany({
      where: { fulfillmentGroup: { order: { customerId } } },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        status: true,
        carrier: true,
        trackingNumber: true,
        updatedAt: true,
        fulfillmentGroup: {
          select: {
            orderId: true,
          },
        },
      },
    }),
    impersonationWhere ?
      prisma.impersonationSupportSession.findMany({
        where: impersonationWhere,
        orderBy: { startedAt: "desc" },
        take: 35,
      })
    : Promise.resolve([]),
    cognitoSub ?
      prisma.platformPresenceSession.findMany({
        where: { cognitoSub },
        orderBy: { lastActivityAt: "desc" },
        take: 50,
      })
    : Promise.resolve([]),
    prisma.operationalIncident.findMany({
      where: operationalIncidentWhereForCustomer(customer.id, emailTrim),
      orderBy: { lastDetectedAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        type: true,
        lastDetectedAt: true,
      },
    }),
    emailTrim ?
      prisma.cateringInquiry.findMany({
        where: { email: { equals: emailTrim, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
        take: 15,
      })
    : Promise.resolve([]),
    queryCustomerOperationalTimeline({
      customer: {
        id: customer.id,
        email: customer.email,
        externalAuthSubject: customer.externalAuthSubject,
      },
      operationalTake: 140,
      governanceTake: 45,
    }),
    prisma.operationalIncident.count({
      where: operationalIncidentWhereForCustomer(customer.id, emailTrim),
    }),
  ]);

  const impersonationGovJustifications =
    impersonationLedger.length === 0 ?
      []
    : await prisma.governanceAuditEvent.findMany({
        where: {
          actionType: "IMPERSONATION_STARTED",
          OR: impersonationLedger.map((row) => ({
            metadata: { path: ["ledgerId"], equals: row.id },
          })),
        },
        orderBy: { createdAt: "desc" },
        take: impersonationLedger.length + 15,
        select: { metadata: true, reason: true, createdAt: true },
      });

  function justificationForLedger(id: string): string | null {
    for (const g of impersonationGovJustifications) {
      const lid = ledgerIdFromMeta(g.metadata);
      if (lid === id && g.reason?.trim()) return g.reason.trim();
    }
    return null;
  }

  return {
    customer,
    emailTrim,
    cognitoSub,
    impersonationWhere,
    orders,
    payments,
    shipments,
    impersonationLedger: impersonationLedger.map((row) => ({
      ...row,
      justification: justificationForLedger(row.id),
    })),
    presenceSessions,
    relatedIncidents,
    cateringInquiries,
    timelineRows,
    openIncidentCount,
    /** Wall clock on the Node snapshot used for presence “recent session” thresholds (SSR/RSC purity). */
    presenceEvaluatedAtMs: Date.now(),
  };
}

function ledgerIdFromMeta(meta: unknown): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const m = meta as Record<string, unknown>;
  const v = m.ledgerId;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export type SuperAdminCustomerDossierPayload = NonNullable<Awaited<ReturnType<typeof loadSuperAdminCustomerDossier>>>;
