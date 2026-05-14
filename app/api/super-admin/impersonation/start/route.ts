import { NextResponse } from "next/server";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { adminGetUserByEmail } from "@/lib/auth/cognito/adminGetUserByEmail";
import { IMPERSONATION_COOKIE, type ImpersonationScope } from "@/lib/governance/impersonationConstants";
import { signImpersonationPayload } from "@/lib/governance/impersonationToken";
import { getImpersonationSecretForSigning } from "@/lib/governance/impersonationSecret";
import { writeGovernanceAudit } from "@/lib/governance/governanceAudit";

function impersonationCookieOpts(maxAgeSec: number) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure,
    path: "/" as const,
    maxAge: maxAgeSec,
  };
}

export async function POST(request: Request) {
  const user = await getCognitoServerSession();
  if (!user?.groups || !isSuperAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const secret = getImpersonationSecretForSigning();
  if (!secret) {
    return NextResponse.json(
      {
        error: "impersonation_unconfigured",
        code: "IMPERSONATION_SECRET_MISSING",
        message:
          "Set IMPERSONATION_SECRET (16+ chars). In development only, IMPERSONATION_ALLOW_UNSAFE_DEV=true enables a deterministic dev secret.",
      },
      { status: 503 }
    );
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

  const targetEmail = String((body as { targetEmail?: string }).targetEmail ?? "").trim().toLowerCase();
  const scopeRaw = String((body as { scope?: string }).scope ?? "").trim();
  const scope: ImpersonationScope | null =
    scopeRaw === "customer" || scopeRaw === "admin" ? scopeRaw : null;

  if (!targetEmail || !targetEmail.includes("@")) {
    return NextResponse.json({ error: "invalid_target_email" }, { status: 400 });
  }
  if (!scope) {
    return NextResponse.json({ error: "invalid_scope" }, { status: 400 });
  }

  let cognitoUser;
  try {
    cognitoUser = await adminGetUserByEmail(targetEmail);
  } catch {
    return NextResponse.json({ error: "cognito_lookup_failed" }, { status: 502 });
  }

  if (!cognitoUser) {
    return NextResponse.json({ error: "target_not_found", code: "USER_NOT_FOUND" }, { status: 404 });
  }

  const token = await signImpersonationPayload(
    {
      actorSub: user.sub,
      actorEmail: user.email ?? user.username ?? "",
      targetEmail: cognitoUser.email,
      targetSub: cognitoUser.sub,
      scope,
      issuedAt: Date.now(),
    },
    secret
  );

  await writeGovernanceAudit({
    type: "impersonation_start",
    actorSub: user.sub,
    actorEmail: user.email ?? user.username ?? "",
    targetEmail: cognitoUser.email,
    meta: { scope },
  });

  const res = NextResponse.json({
    ok: true,
    scope,
    targetEmail: cognitoUser.email,
  });
  res.cookies.set(IMPERSONATION_COOKIE, token, impersonationCookieOpts(60 * 60 * 8));
  return res;
}
