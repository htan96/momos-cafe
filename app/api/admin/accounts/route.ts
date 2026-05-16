import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildAccountMgmtList } from "@/lib/accountManagement/accountsBrowse";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { getCognitoSessionUserFromCookieStore } from "@/lib/auth/cognito/getCognitoSessionUserFromCookieStore";
import { isAdmin } from "@/lib/auth/cognito/roles";

export async function GET(request: Request) {
  const jar = await cookies();
  const user = getCognitoSessionUserFromCookieStore(jar);
  if (!user || !isAdmin(user.groups)) {
    return NextResponse.json({ error: "auth_required", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const customersOnly = url.searchParams.get("customers_only") === "1";
  const adminsOnly = url.searchParams.get("admins_only") === "1";
  const recentSignup = url.searchParams.get("recent_signup") === "1";
  const activeUsers = url.searchParams.get("active_users") === "1";
  const failedPayments = url.searchParams.get("failed_payments") === "1";

  const cfg = getCognitoConfig();

  try {
    const { rows, cognitoUnavailable } = await buildAccountMgmtList(cfg, {
      q,
      customersOnly,
      adminsOnly,
      recentSignup,
      activeUsers,
      failedPayments,
    });

    return NextResponse.json({
      viewer: {
        sub: user.sub,
        staffRoleHint: user.groups?.includes("super_admin") ? "super_admin" : "admin_or_below",
      },
      cognitoUnavailable,
      rows: rows.map((r) => ({
        kind: r.kind,
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        role: r.role,
        signupAt: r.signupAtIso,
        lastActiveAt: r.lastActiveAtIso,
        orderCount: r.orderCount,
        activeSession: r.activeSession,
        linkedCustomerRowId: r.linkedCustomerRowId ?? null,
        cognitoSub: r.cognitoSub ?? null,
      })),
    });
  } catch (err) {
    console.error("[api/admin/accounts]", err);
    return NextResponse.json({ error: "list_failed", code: "INTERNAL" }, { status: 500 });
  }
}
