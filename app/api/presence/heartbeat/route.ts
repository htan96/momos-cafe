import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { readImpersonationFromCookies } from "@/lib/auth/cognito/impersonation";
import { PRESENCE_HEARTBEAT_MIN_INTERVAL_MS, PRESENCE_SESSION_COOKIE } from "@/lib/presence/constants";
import { buildPresenceSessionFields } from "@/lib/presence/derivePresenceContext";
import { clientIpFromRequest, userAgentFromRequest } from "@/lib/presence/requestMeta";
import { truncateUtf8 } from "@/lib/presence/truncate";
import {
  newPresenceSessionPublicId,
  setPresenceSessionCookie,
} from "@/lib/presence/presenceCookies";

export const runtime = "nodejs";

const ROUTE_MAX = 512;

export async function POST(request: Request) {
  const user = await getCognitoServerSession();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let route = "/";
  try {
    const body = (await request.json()) as { route?: unknown };
    if (body && typeof body.route === "string" && body.route.length > 0) {
      route = truncateUtf8(body.route, ROUTE_MAX);
    }
  } catch {
    // allow empty body
  }

  const impersonation = await readImpersonationFromCookies();
  const fields = buildPresenceSessionFields({ user, impersonation });

  const jar = await cookies();
  const existingCookie = jar.get(PRESENCE_SESSION_COOKIE)?.value;

  let sessionPublicId = existingCookie ?? newPresenceSessionPublicId();
  let mustSetCookie = !existingCookie;

  let prior = await prisma.platformPresenceSession.findUnique({
    where: { sessionPublicId },
    select: { lastActivityAt: true, terminatedAt: true },
  });

  if (prior?.terminatedAt) {
    sessionPublicId = newPresenceSessionPublicId();
    mustSetCookie = true;
    prior = await prisma.platformPresenceSession.findUnique({
      where: { sessionPublicId },
      select: { lastActivityAt: true, terminatedAt: true },
    });
  }

  const now = new Date();
  if (prior && !prior.terminatedAt) {
    const delta = now.getTime() - prior.lastActivityAt.getTime();
    if (delta >= 0 && delta < PRESENCE_HEARTBEAT_MIN_INTERVAL_MS) {
      const res = NextResponse.json({ ok: true, skipped: true });
      if (mustSetCookie) {
        setPresenceSessionCookie(res, sessionPublicId);
      }
      return res;
    }
  }

  const ipAddress = clientIpFromRequest(request);
  const userAgent = userAgentFromRequest(request);

  await prisma.platformPresenceSession.upsert({
    where: { sessionPublicId },
    create: {
      sessionPublicId,
      cognitoSub: user.sub,
      userType: fields.userType,
      userRole: fields.userRole,
      displayName: fields.displayName,
      startedAt: now,
      lastActivityAt: now,
      currentRoute: route,
      ipAddress,
      userAgent,
      isActive: true,
      isImpersonated: fields.isImpersonated,
      impersonatorSub: fields.impersonatorSub,
    },
    update: {
      cognitoSub: user.sub,
      userType: fields.userType,
      userRole: fields.userRole,
      displayName: fields.displayName,
      lastActivityAt: now,
      currentRoute: route,
      ipAddress,
      userAgent,
      isActive: true,
      isImpersonated: fields.isImpersonated,
      impersonatorSub: fields.impersonatorSub,
    },
  });

  const res = NextResponse.json({ ok: true });
  if (mustSetCookie) {
    setPresenceSessionCookie(res, sessionPublicId);
  }
  return res;
}
