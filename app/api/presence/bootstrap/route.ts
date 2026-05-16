import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { PRESENCE_SESSION_COOKIE } from "@/lib/presence/constants";
import { newPresenceSessionPublicId, setPresenceSessionCookie } from "@/lib/presence/presenceCookies";

export const runtime = "nodejs";

/** Ensures **`momos_presence_sid`** exists before heartbeats (optional; heartbeat also sets the cookie). */
export async function POST() {
  const user = await getCognitoServerSession();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const jar = await cookies();
  const existing = jar.get(PRESENCE_SESSION_COOKIE)?.value;
  if (existing) {
    return NextResponse.json({ ok: true });
  }

  const sid = newPresenceSessionPublicId();
  const res = NextResponse.json({ ok: true });
  setPresenceSessionCookie(res, sid);
  return res;
}
