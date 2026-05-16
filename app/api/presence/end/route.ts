import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OperationalActivitySeverity } from "@prisma/client";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isAdmin } from "@/lib/auth/cognito/roles";
import { emitOperationalEvent } from "@/lib/operations/emitOperationalEvent";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { PRESENCE_SESSION_COOKIE } from "@/lib/presence/constants";
import { clearPresenceSessionCookie } from "@/lib/presence/presenceCookies";
import { markPresenceSessionTerminated } from "@/lib/presence/terminatePresenceSession";
import { clientIpFromRequest } from "@/lib/presence/requestMeta";
import { recordGovernanceAuditEntry, resolveGovernanceStaffRole } from "@/lib/governance/governanceAuditRecord";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCognitoServerSession();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const jar = await cookies();
  const sessionPublicId = jar.get(PRESENCE_SESSION_COOKIE)?.value;

  await markPresenceSessionTerminated({
    sessionPublicId,
    cognitoSub: user.sub,
  });

  const res = NextResponse.json({ ok: true });
  clearPresenceSessionCookie(res);

  if (isAdmin(user.groups)) {
    const actorType = user.groups?.includes("super_admin") ? "super_admin" : "admin";
    await emitOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.AUTH_LOGOUT,
      severity: OperationalActivitySeverity.info,
      actorType,
      actorId: user.sub,
      actorName: user.email ?? user.username ?? null,
      message: "Presence session ended (explicit)",
      metadata: { cognitoSub: user.sub },
      source: "api.presence.end",
    });
    await recordGovernanceAuditEntry({
      actionType: "SESSION_TERMINATED",
      category: "session",
      actorId: user.sub,
      actorName: user.email ?? user.username ?? user.sub,
      actorRole: resolveGovernanceStaffRole(user.groups),
      description: "Staff presence session ended (explicit)",
      metadata: { terminationReason: "presence_end", source: "api.presence.end" },
      ipAddress: clientIpFromRequest(request),
    });
  }

  return res;
}
