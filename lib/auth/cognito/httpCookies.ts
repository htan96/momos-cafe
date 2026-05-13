import type { NextResponse } from "next/server";
import { jwtMaxAgeSeconds } from "@/lib/auth/cognito/tokens";
import {
  COGNITO_ACCESS_TOKEN_COOKIE,
  COGNITO_ID_TOKEN_COOKIE,
  COGNITO_REFRESH_TOKEN_COOKIE,
  cognitoCookieBase,
} from "@/lib/auth/cognito/sessionCookies";

const REFRESH_FALLBACK_SECONDS = 60 * 60 * 24 * 30;

export function applyCognitoTokenCookies(
  res: NextResponse,
  tokens: { idToken: string; accessToken: string; refreshToken?: string | null }
): void {
  const base = cognitoCookieBase();
  const idMax = jwtMaxAgeSeconds(tokens.idToken) ?? 3600;
  const accessMax = jwtMaxAgeSeconds(tokens.accessToken) ?? idMax;

  res.cookies.set(COGNITO_ID_TOKEN_COOKIE, tokens.idToken, {
    ...base,
    maxAge: idMax,
  });
  res.cookies.set(COGNITO_ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: accessMax,
  });

  if (tokens.refreshToken) {
    res.cookies.set(COGNITO_REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...base,
      maxAge: REFRESH_FALLBACK_SECONDS,
    });
  }
}
