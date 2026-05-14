import { decodeJwt } from "jose";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { COGNITO_ID_TOKEN_COOKIE } from "@/lib/auth/cognito/sessionCookies";
import { issuerMatches, sessionUserFromIdTokenPayload } from "@/lib/auth/cognito/tokens";
import type { CognitoSessionUser } from "@/lib/auth/cognito/types";

/** Minimal cookie jar shape (Next.js `cookies()` or tests). */
export type CookieStoreGet = {
  get: (name: string) => { readonly value: string } | undefined;
};

/**
 * Decode Cognito ID token from the httpOnly session cookie (issuer + expiry, same posture as middleware decode).
 * Returns null when Cognito env is not configured or the cookie is absent / invalid.
 */
export function getCognitoSessionUserFromCookieStore(
  cookieStore: CookieStoreGet
): CognitoSessionUser | null {
  const cfg = getCognitoConfig();
  if (!cfg) return null;
  const token = cookieStore.get(COGNITO_ID_TOKEN_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = decodeJwt(token);
    if (!issuerMatches(cfg, payload.iss)) return null;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < now - 30) return null;
    return sessionUserFromIdTokenPayload(payload);
  } catch {
    return null;
  }
}
