import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OperationalActivitySeverity } from "@prisma/client";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { adminGetUserByEmail } from "@/lib/auth/cognito/adminGetUserByEmail";
import { IMPERSONATION_COOKIE, type ImpersonationScope } from "@/lib/governance/impersonationConstants";
import { signImpersonationPayload } from "@/lib/governance/impersonationToken";
import { getImpersonationSecretForSigning } from "@/lib/governance/impersonationSecret";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";
import { emitOperationalEvent } from "@/lib/operations/emitOperationalEvent";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { prisma } from "@/lib/prisma";
import {
  clientIpFromRequest,
  userAgentFromRequest,
} from "@/lib/governance/impersonationRequestMeta";
import { PRESENCE_SESSION_COOKIE } from "@/lib/presence/constants";
import { newPresenceSessionPublicId } from "@/lib/presence/presenceCookies";

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

/**
 * Admin-scope impersonation requires middleware / session projection so `/admin` runs as the target’s **`admin`** groups
 * without granting `super_admin`. That needs `effectiveGroups` (or equivalent) in the Cognito gate — not shipped yet.
 */
const ADMIN_IMPERSONATION_DEFERRED_MESSAGE =
  "Admin-scope support impersonation is not enabled yet (middleware effective-groups projection). Use customer scope.";

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

  const targetEmailRaw = String((body as { targetEmail?: string }).targetEmail ?? "").trim().toLowerCase();
  const scopeRaw = String((body as { scope?: string }).scope ?? "").trim();
  const scope: ImpersonationScope | null =
    scopeRaw === "customer" || scopeRaw === "admin" ? scopeRaw : null;

  if (!targetEmailRaw || !targetEmailRaw.includes("@")) {
    return NextResponse.json({ error: "invalid_target_email" }, { status: 400 });
  }
  if (!scope) {
    return NextResponse.json({ error: "invalid_scope" }, { status: 400 });
  }

  if (scope === "admin") {
    return NextResponse.json(
      {
        error: "admin_impersonation_deferred",
        code: "ADMIN_IMPERSONATION_DEFERRED",
        message: ADMIN_IMPERSONATION_DEFERRED_MESSAGE,
      },
      { status: 501 }
    );
  }

  let cognitoUser;
  try {
    cognitoUser = await adminGetUserByEmail(targetEmailRaw);
  } catch {
    return NextResponse.json({ error: "cognito_lookup_failed" }, { status: 502 });
  }

  if (!cognitoUser) {
    return NextResponse.json({ error: "target_not_found", code: "USER_NOT_FOUND" }, { status: 404 });
  }

  const targetEmail = cognitoUser.email.trim().toLowerCase();
  const jar = await cookies();
  const presenceSid = jar.get(PRESENCE_SESSION_COOKIE)?.value?.trim();
  const sessionPublicId =
    presenceSid && presenceSid.length > 0 ? presenceSid : newPresenceSessionPublicId();

  const ipAddress = clientIpFromRequest(request);
  const userAgent = userAgentFromRequest(request);

  let ledgerId: string;
  try {
    ledgerId = await prisma.$transaction(async (tx) => {
      await tx.impersonationSupportSession.updateMany({
        where: { actorSub: user.sub, endedAt: null },
        data: { endedAt: new Date() },
      });

      const row = await tx.impersonationSupportSession.create({
        data: {
          sessionPublicId,
          actorSub: user.sub,
          actorEmail: (user.email ?? user.username ?? "").trim().slice(0, 320),
          targetSub: cognitoUser.sub?.trim().slice(0, 128),
          targetEmail: targetEmail.slice(0, 320),
          scope,
          ipAddress,
          userAgent,
        },
        select: { id: true },
      });
      return row.id;
    });
  } catch (e) {
    console.error("[impersonation] ledger create failed", e);
    return NextResponse.json(
      {
        error: "impersonation_ledger_unavailable",
        code: "IMPERSONATION_LEDGER_UNAVAILABLE",
        message: "Could not create support impersonation ledger row.",
      },
      { status: 503 }
    );
  }

  const token = await signImpersonationPayload(
    {
      actorSub: user.sub,
      actorEmail: user.email ?? user.username ?? "",
      targetEmail,
      targetSub: cognitoUser.sub,
      scope,
      issuedAt: Date.now(),
      ledgerId,
      sessionPublicId,
    },
    secret
  );

  await recordGovernanceAuditEntry({
    actionType: "IMPERSONATION_STARTED",
    category: "access",
    actorId: user.sub,
    actorName: user.email ?? user.username ?? "",
    actorRole: "super_admin",
    targetType: "user",
    targetId: cognitoUser.sub,
    targetName: targetEmail,
    description: "Impersonation session started",
    metadata: {
      scope,
      source: "api.super-admin.impersonation.start",
      ledgerId,
      sessionPublicId,
    },
    ipAddress,
  });

  await emitOperationalEvent({
    type: OPERATIONAL_EVENT_TYPES.PRESENCE_IMPERSONATION_STARTED,
    severity: OperationalActivitySeverity.info,
    actorType: "super_admin",
    actorId: user.sub,
    actorName: user.email ?? user.username ?? null,
    message: `Impersonation session started (${scope})`,
    metadata: {
      targetEmail,
      scope,
      ledgerId,
      sessionPublicId,
      ...(cognitoUser.sub ? { targetSub: cognitoUser.sub } : {}),
    },
    source: "api.super-admin.impersonation.start",
  });

  const res = NextResponse.json({
    ok: true,
    scope,
    targetEmail,
    ledgerId,
    sessionPublicId,
  });
  res.cookies.set(IMPERSONATION_COOKIE, token, impersonationCookieOpts(60 * 60 * 8));
  return res;
}
