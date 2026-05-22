import { NextResponse } from "next/server";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";
import { prisma } from "@/lib/prisma";
import {
  clientIpFromRequest,
  userAgentFromRequest,
} from "@/lib/governance/impersonationRequestMeta";

import { isValidCustomerUuid } from "@/lib/accountManagement/loadAccountMgmtDetail";

/**
 * Deferred Cognito revocation — persists an append-only governance row only (no IAM / GlobalSignOut call).
 */
export async function POST(request: Request, props: { params: Promise<{ customerId: string }> }) {
  const user = await getCognitoServerSession();
  if (!user?.groups || !isSuperAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const { customerId } = await props.params;
  if (!isValidCustomerUuid(customerId)) {
    return NextResponse.json({ error: "invalid_customer_id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const justification = typeof body === "object" && body && "justification" in body ?
    String((body as { justification?: string }).justification ?? "").trim()
  : "";

  if (justification.length < 10) {
    return NextResponse.json({ error: "invalid_justification", message: "Justification required (min 10 chars)." }, {
      status: 400,
    });
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { email: true, externalAuthSubject: true },
  });
  if (!customer) {
    return NextResponse.json({ error: "not_found", code: "CUSTOMER_MISSING" }, { status: 404 });
  }

  const ipAddress = clientIpFromRequest(request);
  const ua = userAgentFromRequest(request);

  await recordGovernanceAuditEntry({
    actionType: "CUSTOMER_COGNITO_SESSION_REVOKE_DEFERRED",
    category: "access",
    actorId: user.sub,
    actorName: user.email ?? user.username ?? "",
    actorRole: "super_admin",
    targetType: "customer",
    targetId: customer.externalAuthSubject,
    targetName: customer.email?.trim().toLowerCase() ?? null,
    description: "Cognito session revoke requested via stub endpoint (IAM integration pending)",
    reason: justification,
    metadata: {
      source: "api.super-admin.users.customers.revoke-sessions.stub",
      customerId,
      hasCognitoSubject: Boolean(customer.externalAuthSubject?.trim()),
      userAgent: ua,
    },
    ipAddress,
  });

  return NextResponse.json({
    ok: false,
    deferred: true,
    message:
      "Recorded governance intent only. Cognito revocation APIs are not wired — ask infra before enabling destructive disables.",
    customerId,
  });
}
