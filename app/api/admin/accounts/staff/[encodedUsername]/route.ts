import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loadAccountMgmtStaffDetail } from "@/lib/accountManagement/loadAccountMgmtDetail";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { getCognitoSessionUserFromCookieStore } from "@/lib/auth/cognito/getCognitoSessionUserFromCookieStore";
import { isAdmin } from "@/lib/auth/cognito/roles";

export async function GET(_req: Request, ctx: { params: Promise<{ encodedUsername: string }> }) {
  const jar = await cookies();
  const user = getCognitoSessionUserFromCookieStore(jar);
  if (!user || !isAdmin(user.groups)) {
    return NextResponse.json({ error: "auth_required", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { encodedUsername } = await ctx.params;
  const cfg = getCognitoConfig();

  try {
    const detail = await loadAccountMgmtStaffDetail(encodedUsername, cfg);
    if ("error" in detail) {
      const map = { cognito_unconfigured: 503, cognito_unreachable: 502, not_found: 404 } as const;
      return NextResponse.json(
        { error: detail.error, code: detail.error.toUpperCase() },
        { status: map[detail.error] }
      );
    }

    return NextResponse.json({
      viewerStaffSuper: Boolean(user.groups?.includes("super_admin")),
      payload: {
        kind: detail.kind,
        poolUser: {
          username: detail.poolUser.username,
          sub: detail.poolUser.sub,
          email: detail.poolUser.email,
          name: detail.poolUser.name,
          userCreateDate: detail.poolUser.userCreateDate?.toISOString() ?? null,
        },
        groups: detail.groups,
        role: detail.role,
        profile: detail.profile,
        linkedCustomer: detail.linkedCustomer
          ? {
              id: detail.linkedCustomer.id,
              email: detail.linkedCustomer.email,
              phone: detail.linkedCustomer.phone,
              orderCount: detail.linkedCustomer._count.orders,
              createdAt: detail.linkedCustomer.createdAt.toISOString(),
            }
          : null,
        orders: detail.orders.map((o) => ({
          id: o.id,
          status: o.status,
          totalCents: o.totalCents,
          createdAt: o.createdAt.toISOString(),
        })),
        presenceSessions: detail.presenceSessions.map((s) => ({
          id: s.id,
          sessionPublicId: s.sessionPublicId,
          lastActivityAt: s.lastActivityAt.toISOString(),
          isActive: s.isActive,
          isImpersonated: s.isImpersonated,
          currentRoute: s.currentRoute,
          startedAt: s.startedAt.toISOString(),
          terminatedAt: s.terminatedAt?.toISOString() ?? null,
        })),
        activityEvents: detail.activityEvents.map((e) => ({
          id: e.id,
          type: e.type,
          severity: e.severity,
          message: e.message,
          actorType: e.actorType,
          actorId: e.actorId,
          actorName: e.actorName,
          metadata: e.metadata,
          createdAt: e.createdAt.toISOString(),
        })),
        impersonationLedger: detail.impersonationLedger.map((row) => ({
          id: row.id,
          actorEmail: row.actorEmail,
          targetEmail: row.targetEmail,
          scope: row.scope,
          startedAt: row.startedAt.toISOString(),
          endedAt: row.endedAt?.toISOString() ?? null,
        })),
        cateringInquiries: detail.cateringInquiries.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          status: c.status,
          createdAt: c.createdAt.toISOString(),
        })),
        governanceRows: detail.governanceRows.map((g) => ({
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
        })),
      },
    });
  } catch (e) {
    console.error("[api/admin/accounts/staff]", encodedUsername, e);
    return NextResponse.json({ error: "detail_failed" }, { status: 500 });
  }
}
