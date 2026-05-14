import { NextResponse } from "next/server";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { IMPERSONATION_COOKIE } from "@/lib/governance/impersonationConstants";
import { writeGovernanceAudit } from "@/lib/governance/governanceAudit";

export async function POST() {
  const user = await getCognitoServerSession();
  if (!user?.groups || !isSuperAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(IMPERSONATION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  await writeGovernanceAudit({
    type: "impersonation_end",
    actorSub: user.sub,
    actorEmail: user.email ?? user.username ?? "",
  });

  return res;
}
