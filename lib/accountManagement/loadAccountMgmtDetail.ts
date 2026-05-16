import { Prisma } from "@prisma/client";
import type { ListedPoolUser } from "@/lib/auth/cognito/adminPoolDirectory";
import { adminGetPoolUser, adminListAssignedGroupsForUser } from "@/lib/auth/cognito/adminPoolDirectory";
import type { CognitoEnvConfig } from "@/lib/auth/cognito/config";
import { operationalIncidentWhereForCustomer } from "@/lib/operations/operationalContextLinks";
import { prisma } from "@/lib/prisma";
import type { AccountMgmtRole } from "@/lib/accountManagement/accountsBrowse";
import { displayNameFromAuth } from "@/lib/accountManagement/accountsBrowse";
import { deriveAccountRoleFromGroups } from "@/lib/accountManagement/deriveAccountRole";

const CUSTOMER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function buildCustomerActivityWhere(customer: {
  id: string;
  email: string | null;
  externalAuthSubject: string | null;
}): Prisma.OperationalActivityEventWhereInput {
  const or: Prisma.OperationalActivityEventWhereInput[] = [
    { metadata: { path: ["customerId"], equals: customer.id } },
    { actorId: customer.id },
  ];
  if (customer.externalAuthSubject?.trim()) {
    or.push({ actorId: customer.externalAuthSubject.trim() });
  }
  const mail = customer.email?.trim();
  if (mail) {
    const lower = mail.toLowerCase();
    or.push({ metadata: { path: ["targetEmail"], equals: lower } });
    if (lower !== mail) {
      or.push({ metadata: { path: ["targetEmail"], equals: mail } });
    }
  }
  return { OR: or };
}

export function isValidCustomerUuid(customerId: string): boolean {
  return CUSTOMER_ID_RE.test(customerId);
}

export async function loadAccountMgmtCustomerDetail(customerId: string) {
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

  const cognitoSub = customer.externalAuthSubject?.trim() ?? null;
  const emailTrim = customer.email?.trim() ?? null;

  const impersonationWhere =
    emailTrim || cognitoSub ?
      {
        OR: [
          ...(emailTrim ? [{ targetEmail: { equals: emailTrim, mode: "insensitive" as const } }] : []),
          ...(cognitoSub ? [{ targetSub: cognitoSub }] : []),
        ],
      }
    : null;

  const activityWhere = buildCustomerActivityWhere(customer);

  const [orders, presenceSessions, activityEvents, impersonationLedger, cateringInquiries, governanceForUser] =
    await Promise.all([
      prisma.commerceOrder.findMany({
        where: { customerId: customer.id },
        take: 25,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          totalCents: true,
          createdAt: true,
        },
      }),
      cognitoSub ?
        prisma.platformPresenceSession.findMany({
          where: { cognitoSub },
          orderBy: { lastActivityAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
      prisma.operationalActivityEvent.findMany({
        where: activityWhere,
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      impersonationWhere ?
        prisma.impersonationSupportSession.findMany({
          where: impersonationWhere,
          orderBy: { startedAt: "desc" },
          take: 25,
        })
      : Promise.resolve([]),
      emailTrim ?
        prisma.cateringInquiry.findMany({
          where: { email: { equals: emailTrim, mode: "insensitive" } },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
      prisma.governanceAuditEvent.findMany({
        where: {
          OR: [
            ...(cognitoSub ? [{ targetId: cognitoSub }] : []),
            ...(emailTrim ?
              [
                { targetName: { equals: emailTrim, mode: Prisma.QueryMode.insensitive } },
                {
                  metadata: {
                    path: ["targetEmail"],
                    equals: emailTrim.toLowerCase(),
                  },
                },
              ]
            : []),
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 35,
      }),
    ]);

  const relatedIncidents = await prisma.operationalIncident.findMany({
    where: operationalIncidentWhereForCustomer(customer.id, emailTrim),
    orderBy: { lastDetectedAt: "desc" },
    take: 12,
  });

  return {
    kind: "customer" as const,
    customer,
    profile: {
      displayName: displayNameFromAuth(customer.authMetadata),
      role: "customer" as const satisfies AccountMgmtRole,
    },
    orders,
    presenceSessions,
    activityEvents,
    impersonationLedger,
    cateringInquiries,
    governanceRows: governanceForUser,
    incidents: relatedIncidents,
  };
}

export type StaffDetailError = "cognito_unconfigured" | "cognito_unreachable" | "not_found";

export type StaffDetailPayload = {
  kind: "staff";
  poolUser: ListedPoolUser;
  groups: string[];
  role: AccountMgmtRole;
  linkedCustomer: {
    id: string;
    email: string | null;
    phone: string | null;
    externalAuthSubject: string | null;
    authMetadata: unknown;
    createdAt: Date;
    updatedAt: Date;
    _count: { orders: number };
  } | null;
  orders: Array<{ id: string; status: string; totalCents: number; createdAt: Date }>;
  presenceSessions: Awaited<ReturnType<typeof prisma.platformPresenceSession.findMany>>;
  activityEvents: Awaited<ReturnType<typeof prisma.operationalActivityEvent.findMany>>;
  impersonationLedger: Awaited<ReturnType<typeof prisma.impersonationSupportSession.findMany>>;
  cateringInquiries: Awaited<ReturnType<typeof prisma.cateringInquiry.findMany>>;
  governanceRows: Awaited<ReturnType<typeof prisma.governanceAuditEvent.findMany>>;
  profile: { displayName: string | null };
};

export async function loadAccountMgmtStaffDetail(
  encodedUsername: string,
  cfg: CognitoEnvConfig | null
): Promise<{ error: StaffDetailError } | StaffDetailPayload> {
  if (!cfg) return { error: "cognito_unconfigured" };

  const cognitoUsername = (() => {
    try {
      return decodeURIComponent(encodedUsername).trim();
    } catch {
      return encodedUsername.trim();
    }
  })();

  let poolUser: ListedPoolUser | null = null;
  try {
    poolUser = await adminGetPoolUser(cfg, cognitoUsername);
  } catch {
    return { error: "cognito_unreachable" };
  }
  if (!poolUser) return { error: "not_found" };

  let groups: string[] = [];
  try {
    groups = await adminListAssignedGroupsForUser(cfg, poolUser.username);
  } catch {
    return { error: "cognito_unreachable" };
  }

  const role = deriveAccountRoleFromGroups(groups);

  const mailNorm = poolUser.email?.trim().toLowerCase() ?? "";

  const prismaCustomer =
    mailNorm ?
      await prisma.customer.findFirst({
        where: { email: { equals: mailNorm, mode: "insensitive" } },
        select: {
          id: true,
          email: true,
          phone: true,
          externalAuthSubject: true,
          authMetadata: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { orders: true } },
        },
      })
    : null;

  const impersonationWhere =
    mailNorm ?
      {
        OR: [{ targetEmail: { equals: mailNorm, mode: "insensitive" as const } }, { targetSub: poolUser.sub }],
      }
    : { targetSub: poolUser.sub };

  const [presenceSessions, activityEvents, impersonationLedger, cateringInquiries, governanceForUser, commerceOrders] =
    await Promise.all([
      prisma.platformPresenceSession.findMany({
        where: { cognitoSub: poolUser.sub },
        orderBy: { lastActivityAt: "desc" },
        take: 50,
      }),
      prisma.operationalActivityEvent.findMany({
        where: {
          OR: [
            { actorId: poolUser.sub },
            ...(mailNorm ? [{ metadata: { path: ["targetEmail"], equals: mailNorm } }] : []),
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 35,
      }),
      prisma.impersonationSupportSession.findMany({
        where: impersonationWhere,
        orderBy: { startedAt: "desc" },
        take: 25,
      }),
      mailNorm ?
        prisma.cateringInquiry.findMany({
          where: { email: { equals: mailNorm, mode: "insensitive" } },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
      prisma.governanceAuditEvent.findMany({
        where: {
          OR: [
            { targetId: poolUser.sub },
            ...(mailNorm ? [{ targetName: { equals: mailNorm, mode: Prisma.QueryMode.insensitive } }] : []),
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 35,
      }),
      prismaCustomer ?
        prisma.commerceOrder.findMany({
          where: { customerId: prismaCustomer.id },
          take: 25,
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true, totalCents: true, createdAt: true },
        })
      : Promise.resolve([]),
    ]);

  const payload: StaffDetailPayload = {
    kind: "staff",
    poolUser,
    groups,
    role,
    linkedCustomer: prismaCustomer,
    orders: commerceOrders,
    presenceSessions,
    activityEvents,
    impersonationLedger,
    cateringInquiries,
    governanceRows: governanceForUser,
    profile: {
      displayName:
        prismaCustomer ? (displayNameFromAuth(prismaCustomer.authMetadata) ?? poolUser.name) : poolUser.name,
    },
  };

  return payload;
}
