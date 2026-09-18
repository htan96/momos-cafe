import type { NextResponse } from "next/server";
import { SignJWT } from "jose";

import {
  BOOTSTRAP_SUPER_ADMIN_GROUP,
  MOMOS_BOOTSTRAP_SESSION_COOKIE,
  bootstrapSessionMaxAgeSec,
} from "@/lib/bootstrap/config";
import { bootstrapSessionHmacKeyMaterial } from "@/lib/bootstrap/sessionKey";

export { verifyBootstrapAdminSession, type BootstrapAdminSession } from "@/lib/bootstrap/sessionVerify";

export async function sealBootstrapAdminSession(email: string): Promise<string> {
  const key = bootstrapSessionHmacKeyMaterial();
  return await new SignJWT({
    typ: "bootstrap_admin",
    email: email.trim().toLowerCase(),
    groups: [BOOTSTRAP_SUPER_ADMIN_GROUP],
    isBootstrapAdmin: true,
    effectiveRole: "super_admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${bootstrapSessionMaxAgeSec()}s`)
    .sign(key);
}

export function sessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export function setBootstrapSessionCookie(res: Pick<NextResponse, "cookies">, token: string) {
  res.cookies.set(
    MOMOS_BOOTSTRAP_SESSION_COOKIE,
    token,
    sessionCookieOptions(bootstrapSessionMaxAgeSec())
  );
}

export function clearBootstrapSessionCookie(res: Pick<NextResponse, "cookies">) {
  res.cookies.set(MOMOS_BOOTSTRAP_SESSION_COOKIE, "", {
    ...sessionCookieOptions(0),
    maxAge: 0,
  });
}
