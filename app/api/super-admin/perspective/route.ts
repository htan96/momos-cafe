import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import {
  defaultRouteForPerspective,
  OPERATIONAL_PERSPECTIVE_COOKIE,
  OperationalPerspective,
  parseOperationalPerspective,
} from "@/lib/governance/perspective";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";

function cookieOpts(maxAge: number) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge,
  };
}

export async function GET() {
  const user = await getCognitoServerSession();
  if (!user?.groups || !isSuperAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const jar = await cookies();
  const fromCookie = jar.get(OPERATIONAL_PERSPECTIVE_COOKIE)?.value;
  const perspective =
    parseOperationalPerspective(fromCookie) ?? OperationalPerspective.governance;
  return NextResponse.json({ perspective, defaultRoute: defaultRouteForPerspective(perspective) });
}

export async function POST(request: Request) {
  const user = await getCognitoServerSession();
  if (!user?.groups || !isSuperAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const raw =
    typeof body === "object" && body && "perspective" in body
      ? String((body as { perspective?: string }).perspective ?? "").trim()
      : "";
  const parsed = parseOperationalPerspective(raw);
  if (!parsed) {
    return NextResponse.json({ error: "invalid_perspective" }, { status: 400 });
  }

  await recordGovernanceAuditEntry({
    actionType: "PERSPECTIVE_CHANGED",
    category: "operations",
    actorId: user.sub,
    actorName: user.email ?? user.username ?? "",
    actorRole: "super_admin",
    description: "Operational perspective updated",
    metadata: { perspective: parsed, source: "api.super-admin.perspective" },
  });

  const res = NextResponse.json({
    ok: true,
    perspective: parsed,
    defaultRoute: defaultRouteForPerspective(parsed),
  });
  res.cookies.set(OPERATIONAL_PERSPECTIVE_COOKIE, parsed, cookieOpts(60 * 60 * 24 * 400));
  return res;
}
