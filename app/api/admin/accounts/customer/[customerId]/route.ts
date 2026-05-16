import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidCustomerUuid, loadAccountMgmtCustomerDetail } from "@/lib/accountManagement/loadAccountMgmtDetail";
import { getCognitoSessionUserFromCookieStore } from "@/lib/auth/cognito/getCognitoSessionUserFromCookieStore";
import { isAdmin } from "@/lib/auth/cognito/roles";

export async function GET(_req: Request, ctx: { params: Promise<{ customerId: string }> }) {
  const jar = await cookies();
  const user = getCognitoSessionUserFromCookieStore(jar);
  if (!user || !isAdmin(user.groups)) {
    return NextResponse.json({ error: "auth_required", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { customerId } = await ctx.params;
  if (!isValidCustomerUuid(customerId)) {
    return NextResponse.json({ error: "invalid_customer_id" }, { status: 400 });
  }

  try {
    const detail = await loadAccountMgmtCustomerDetail(customerId);
    if (!detail) return NextResponse.json({ error: "not_found", code: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({
      viewerStaffSuper: Boolean(user.groups?.includes("super_admin")),
      payload: serializeCustomerDetail(detail),
    });
  } catch (e) {
    console.error("[api/admin/accounts/customer]", customerId, e);
    return NextResponse.json({ error: "detail_failed" }, { status: 500 });
  }
}

function serializeCustomerDetail(detail: NonNullable<Awaited<ReturnType<typeof loadAccountMgmtCustomerDetail>>>) {
  return {
    kind: detail.kind,
    profile: detail.profile,
    customer: serializeCustomer(detail.customer),
    orders: detail.orders.map(serializeOrder),
    presenceSessions: detail.presenceSessions.map(serializePresence),
    activityEvents: detail.activityEvents.map(serializeOperational),
    impersonationLedger: detail.impersonationLedger.map(serializeImpersonation),
    cateringInquiries: detail.cateringInquiries.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    })),
    governanceRows: detail.governanceRows.map(serializeGovernance),
    incidents: detail.incidents.map((i) => ({
      id: i.id,
      type: i.type,
      severity: i.severity,
      status: i.status,
      title: i.title,
      lastDetectedAt: i.lastDetectedAt?.toISOString() ?? null,
    })),
  };
}

function serializeCustomer(c: NonNullable<Awaited<ReturnType<typeof loadAccountMgmtCustomerDetail>>>["customer"]) {
  return {
    id: c.id,
    email: c.email,
    phone: c.phone,
    externalAuthSubject: c.externalAuthSubject,
    squareCustomerId: c.squareCustomerId,
    authMetadata: c.authMetadata,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function serializeOrder(o: { id: string; status: string; totalCents: number; createdAt: Date }) {
  return { id: o.id, status: o.status, totalCents: o.totalCents, createdAt: o.createdAt.toISOString() };
}

function serializePresence(
  s: NonNullable<
    Awaited<ReturnType<typeof loadAccountMgmtCustomerDetail>>
  >["presenceSessions"][number]
) {
  return {
    id: s.id,
    sessionPublicId: s.sessionPublicId,
    lastActivityAt: s.lastActivityAt.toISOString(),
    isActive: s.isActive,
    isImpersonated: s.isImpersonated,
    currentRoute: s.currentRoute,
    startedAt: s.startedAt.toISOString(),
    terminatedAt: s.terminatedAt?.toISOString() ?? null,
  };
}

function serializeOperational(
  e: NonNullable<
    Awaited<ReturnType<typeof loadAccountMgmtCustomerDetail>>
  >["activityEvents"][number]
) {
  return {
    id: e.id,
    type: e.type,
    severity: e.severity,
    message: e.message,
    actorType: e.actorType,
    actorId: e.actorId,
    actorName: e.actorName,
    metadata: e.metadata,
    createdAt: e.createdAt.toISOString(),
  };
}

function serializeImpersonation(
  row: NonNullable<
    Awaited<ReturnType<typeof loadAccountMgmtCustomerDetail>>
  >["impersonationLedger"][number]
) {
  return {
    id: row.id,
    actorEmail: row.actorEmail,
    targetEmail: row.targetEmail,
    scope: row.scope,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
  };
}

function serializeGovernance(
  g: NonNullable<
    Awaited<ReturnType<typeof loadAccountMgmtCustomerDetail>>
  >["governanceRows"][number]
) {
  return {
    id: g.id,
    actionType: g.actionType,
    actorName: g.actorName,
    actorRole: g.actorRole,
    targetType: g.targetType,
    targetId: g.targetId,
    targetName: g.targetName,
    description: g.description,
    metadata: g.metadata,
    createdAt: g.createdAt.toISOString(),
  };
}
