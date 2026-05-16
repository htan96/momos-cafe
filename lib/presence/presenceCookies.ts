import type { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { isProduction } from "@/lib/auth/cognito/sessionCookies";
import { PRESENCE_SESSION_COOKIE } from "@/lib/presence/constants";

const MAX_AGE_SEC = 60 * 60 * 24 * 90;

export function setPresenceSessionCookie(res: NextResponse, sessionPublicId: string): void {
  res.cookies.set(PRESENCE_SESSION_COOKIE, sessionPublicId, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export function clearPresenceSessionCookie(res: NextResponse): void {
  res.cookies.set(PRESENCE_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: 0,
  });
}

export function newPresenceSessionPublicId(): string {
  return randomUUID();
}
