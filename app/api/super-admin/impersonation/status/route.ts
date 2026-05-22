import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveSuperStaffDelegation } from "@/lib/auth/cognito/requireSuperStaff";
import {
  jwtUserBindsVerifiedImpersonation,
} from "@/lib/auth/cognito/staffDelegatedAuthority";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { IMPERSONATION_COOKIE } from "@/lib/governance/impersonationConstants";
import { verifyImpersonationToken } from "@/lib/governance/impersonationToken";
import { getImpersonationSecretForVerification } from "@/lib/governance/impersonationSecret";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { jwtUser, authorityGroups } = await resolveSuperStaffDelegation();
  if (!jwtUser || !isSuperAdmin(authorityGroups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const secret = getImpersonationSecretForVerification();
  if (!secret) {
    return NextResponse.json({ active: false, configured: false });
  }

  const jar = await cookies();
  const raw = jar.get(IMPERSONATION_COOKIE)?.value;
  if (!raw) {
    return NextResponse.json({ active: false, configured: true });
  }

  const payload = await verifyImpersonationToken(raw, secret);
  if (!payload || !jwtUserBindsVerifiedImpersonation(jwtUser, payload)) {
    return NextResponse.json({ active: false, configured: true, stale: true });
  }

  try {
    const row = await prisma.impersonationSupportSession.findFirst({
      where: {
        id: payload.ledgerId,
        actorSub: payload.actorSub,
        endedAt: null,
        targetEmail: payload.targetEmail.trim().toLowerCase(),
        scope: payload.scope,
        sessionPublicId: payload.sessionPublicId,
      },
    });
    if (!row) {
      return NextResponse.json({ active: false, configured: true, stale: true });
    }

    return NextResponse.json({
      active: true,
      configured: true,
      actor: { sub: payload.actorSub, email: payload.actorEmail },
      target: { email: payload.targetEmail, sub: payload.targetSub ?? null },
      scope: payload.scope,
      issuedAt: payload.issuedAt,
      ledgerId: row.id,
      sessionPublicId: row.sessionPublicId,
      startedAt: row.startedAt.toISOString(),
    });
  } catch (e) {
    console.error("[impersonation] status ledger lookup failed", e);
    return NextResponse.json(
      {
        active: false,
        configured: true,
        stale: true,
        error: "ledger_unavailable",
        code: "IMPERSONATION_LEDGER_UNAVAILABLE",
      },
      { status: 503 }
    );
  }
}
