import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { AccountMgmtRole } from "@/lib/accountManagement/accountsBrowse";
import { applyStaffRoleChange } from "@/lib/accountManagement/applyStaffRoleChange";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { getCognitoSessionUserFromCookieStore } from "@/lib/auth/cognito/getCognitoSessionUserFromCookieStore";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";

const ROLES: AccountMgmtRole[] = ["customer", "admin", "super_admin"];

function parseRole(v: unknown): AccountMgmtRole | null {
  if (typeof v !== "string") return null;
  const t = v.trim() as AccountMgmtRole;
  return ROLES.includes(t) ? t : null;
}

export async function PATCH(request: Request) {
  const jar = await cookies();
  const user = getCognitoSessionUserFromCookieStore(jar);
  if (!user?.groups || !isSuperAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "SUPER_ADMIN_REQUIRED" }, { status: 403 });
  }

  const cfg = getCognitoConfig();
  if (!cfg) {
    return NextResponse.json({ error: "cognito_unconfigured", code: "COGNITO_UNCONFIGURED" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const username =
    typeof (body as { cognitoUsername?: string }).cognitoUsername === "string"
      ? (body as { cognitoUsername: string }).cognitoUsername
      : "";
  const nextRole = parseRole((body as { nextRole?: string }).nextRole);
  const selfDemotionAckEmail =
    typeof (body as { selfDemotionAckEmail?: string }).selfDemotionAckEmail === "string"
      ? (body as { selfDemotionAckEmail: string }).selfDemotionAckEmail
      : null;

  if (!username.trim()) {
    return NextResponse.json({ error: "missing_cognito_username" }, { status: 400 });
  }
  if (!nextRole) {
    return NextResponse.json({ error: "invalid_next_role" }, { status: 400 });
  }

  const out = await applyStaffRoleChange({
    cfg,
    request,
    actor: {
      sub: user.sub,
      email: user.email ?? null,
      username: user.username ?? null,
    },
    targetUsernameRaw: username,
    nextRole,
    selfDemotionAckEmail,
  });

  if (!out.ok) {
    return NextResponse.json(
      { error: out.code, message: out.message },
      { status: out.status }
    );
  }

  return NextResponse.json({
    ok: true,
    username: out.username,
    fromRole: out.fromRole,
    toRole: out.toRole,
  });
}
