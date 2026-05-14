import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { applyCognitoTokenCookies } from "@/lib/auth/cognito/httpCookies";
import { performCognitoRefreshFromTokens } from "@/lib/auth/cognito/performRefreshFromTokens";
import {
  COGNITO_ID_TOKEN_COOKIE,
  COGNITO_REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/cognito/sessionCookies";

export const runtime = "nodejs";

export async function POST() {
  const jar = await cookies();
  const refresh = jar.get(COGNITO_REFRESH_TOKEN_COOKIE)?.value;
  const existingId = jar.get(COGNITO_ID_TOKEN_COOKIE)?.value;

  const result = await performCognitoRefreshFromTokens({ refreshToken: refresh, existingIdToken: existingId });

  if (!result.ok) {
    const status =
      result.code === "unconfigured"
        ? 503
        : result.code === "token_validation_failed"
          ? 502
          : 401;
    return NextResponse.json({ error: result.code }, { status });
  }

  const res = NextResponse.json({
    ok: true,
    user: result.user ?? undefined,
  });

  applyCognitoTokenCookies(res, {
    idToken: result.tokens.idToken,
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
  });
  return res;
}
