import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OperationalActivitySeverity } from "@prisma/client";
import { resolveSuperStaffDelegation } from "@/lib/auth/cognito/requireSuperStaff";
import { jwtUserBindsVerifiedImpersonation } from "@/lib/auth/cognito/staffDelegatedAuthority";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { IMPERSONATION_COOKIE } from "@/lib/governance/impersonationConstants";
import { verifyImpersonationToken } from "@/lib/governance/impersonationToken";
import { getImpersonationSecretForVerification } from "@/lib/governance/impersonationSecret";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";
import { emitOperationalEvent } from "@/lib/operations/emitOperationalEvent";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { prisma } from "@/lib/prisma";

function clearImpersonationCookie(res: NextResponse) {
  res.cookies.set(IMPERSONATION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function POST() {
  const { jwtUser, authorityGroups } = await resolveSuperStaffDelegation();
  if (!jwtUser || !isSuperAdmin(authorityGroups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const secret = getImpersonationSecretForVerification();
  const jar = await cookies();
  const raw = jar.get(IMPERSONATION_COOKIE)?.value;

  const res = NextResponse.json({ ok: true });

  if (!secret || !raw) {
    clearImpersonationCookie(res);
    return res;
  }

  const payload = await verifyImpersonationToken(raw, secret);
  if (!payload || !jwtUserBindsVerifiedImpersonation(jwtUser, payload)) {
    clearImpersonationCookie(res);
    return res;
  }

  let durationMs: number | null = null;
  const ledgerId = payload.ledgerId;
  let closedLedger = false;

  try {
    const row = await prisma.impersonationSupportSession.findFirst({
      where: {
        id: payload.ledgerId,
        actorSub: payload.actorSub,
        endedAt: null,
      },
    });

    if (row) {
      const endedAt = new Date();
      durationMs = endedAt.getTime() - row.startedAt.getTime();
      await prisma.impersonationSupportSession.update({
        where: { id: row.id },
        data: { endedAt },
      });
      closedLedger = true;
    }
  } catch (e) {
    console.error("[impersonation] ledger end failed", e);
    return NextResponse.json(
      {
        error: "impersonation_ledger_unavailable",
        code: "IMPERSONATION_LEDGER_UNAVAILABLE",
        message: "Could not close support impersonation ledger row.",
      },
      { status: 503 }
    );
  }

  clearImpersonationCookie(res);

  if (closedLedger && durationMs != null) {
    await recordGovernanceAuditEntry({
      actionType: "IMPERSONATION_ENDED",
      category: "access",
      actorId: payload.actorSub,
      actorName: payload.actorEmail,
      actorRole: "super_admin",
      description: "Impersonation session ended",
      metadata: {
        source: "api.super-admin.impersonation.end",
        ledgerId,
        durationMs,
        durationSeconds: Math.round(durationMs / 1000),
      },
    });

    await emitOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.PRESENCE_IMPERSONATION_ENDED,
      severity: OperationalActivitySeverity.info,
      actorType: "super_admin",
      actorId: payload.actorSub,
      actorName: payload.actorEmail,
      message: `Impersonation session ended (${Math.round(durationMs / 1000)}s)`,
      metadata: {
        ledgerId,
        durationMs,
        durationSeconds: Math.round(durationMs / 1000),
      },
      source: "api.super-admin.impersonation.end",
    });
  }

  return res;
}
