import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { validateAccessToken } from "@/lib/auth/cognito/cognitoClient";
import { createCognitoAuthProvider } from "@/lib/auth/cognito/cognitoAuthAdapter";
import { decodeCognitoIdTokenUnsafe } from "@/lib/auth/cognito/tokens";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { applyCognitoTokenCookies } from "@/lib/auth/cognito/httpCookies";
import {
  COGNITO_ID_TOKEN_COOKIE,
  COGNITO_REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/cognito/sessionCookies";

export const runtime = "nodejs";

export async function POST() {
  const cfg = getCognitoConfig();
  if (!cfg) {
    return NextResponse.json({ error: "cognito_unconfigured" }, { status: 503 });
  }

  const jar = await cookies();
  const refresh = jar.get(COGNITO_REFRESH_TOKEN_COOKIE)?.value;
  const existingId = jar.get(COGNITO_ID_TOKEN_COOKIE)?.value;

  if (!refresh || !existingId) {
    return NextResponse.json({ error: "missing_refresh" }, { status: 401 });
  }

  const hint = decodeCognitoIdTokenUnsafe(existingId)?.username;
  if (!hint) {
    return NextResponse.json({ error: "bad_id_token" }, { status: 401 });
  }

  const provider = createCognitoAuthProvider(cfg);
  const nextTokens = await provider.refreshSession({
    refreshToken: refresh,
    idTokenUsername: hint,
  });

  if (!nextTokens) {
    return NextResponse.json({ error: "refresh_rejected" }, { status: 401 });
  }

  const valid = await validateAccessToken(cfg, nextTokens.accessToken);
  if (!valid) {
    return NextResponse.json({ error: "token_validation_failed" }, { status: 502 });
  }

  const user = decodeCognitoIdTokenUnsafe(nextTokens.idToken);
  const res = NextResponse.json({
    ok: true,
    user: user ?? undefined,
  });

  applyCognitoTokenCookies(res, {
    ...nextTokens,
    refreshToken: nextTokens.refreshToken ?? refresh,
  });
  return res;
}
