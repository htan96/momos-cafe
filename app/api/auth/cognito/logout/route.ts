import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signOutEverywhere } from "@/lib/auth/cognito/cognitoClient";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { clearCognitoCookieJar, COGNITO_ACCESS_TOKEN_COOKIE } from "@/lib/auth/cognito/sessionCookies";
import { emitStaffAuthLogoutEvent } from "@/lib/presence/emitStaffAuthLogout";
import { PRESENCE_SESSION_COOKIE } from "@/lib/presence/constants";
import { clearPresenceSessionCookie } from "@/lib/presence/presenceCookies";
import { markPresenceSessionTerminated } from "@/lib/presence/terminatePresenceSession";
import { clientIpFromRequest } from "@/lib/presence/requestMeta";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const cfg = getCognitoConfig();
  const jar = await cookies();
  const access = jar.get(COGNITO_ACCESS_TOKEN_COOKIE)?.value;
  const user = await getCognitoServerSession();
  const presenceSid = jar.get(PRESENCE_SESSION_COOKIE)?.value;

  if (cfg) {
    await signOutEverywhere(cfg, access);
  }

  const res = NextResponse.json({ ok: true });
  clearCognitoCookieJar(res);

  await markPresenceSessionTerminated({
    sessionPublicId: presenceSid,
    cognitoSub: user?.sub,
  });
  clearPresenceSessionCookie(res);

  if (user) {
    await emitStaffAuthLogoutEvent(user, { ipAddress: clientIpFromRequest(request) });
  }
  return res;
}
