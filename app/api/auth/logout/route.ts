import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signOutEverywhere } from "@/lib/auth/cognito/cognitoClient";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { clearCognitoCookieJar, COGNITO_ACCESS_TOKEN_COOKIE } from "@/lib/auth/cognito/sessionCookies";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/auth/customerSessionCrypto";

export const runtime = "nodejs";

export async function POST() {
  const secure = process.env.NODE_ENV === "production";
  const cfg = getCognitoConfig();
  const jar = await cookies();
  const access = jar.get(COGNITO_ACCESS_TOKEN_COOKIE)?.value;

  if (cfg) {
    await signOutEverywhere(cfg, access);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: 0,
  });
  clearCognitoCookieJar(res);
  return res;
}
