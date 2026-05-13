import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signOutEverywhere } from "@/lib/auth/cognito/cognitoClient";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { clearCognitoCookieJar, COGNITO_ACCESS_TOKEN_COOKIE } from "@/lib/auth/cognito/sessionCookies";

export const runtime = "nodejs";

export async function POST() {
  const cfg = getCognitoConfig();
  const jar = await cookies();
  const access = jar.get(COGNITO_ACCESS_TOKEN_COOKIE)?.value;

  if (cfg) {
    await signOutEverywhere(cfg, access);
  }

  const res = NextResponse.json({ ok: true });
  clearCognitoCookieJar(res);
  return res;
}
