import { decodeJwt } from "jose";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { COGNITO_ID_TOKEN_COOKIE } from "@/lib/auth/cognito/sessionCookies";
import { issuerMatches, sessionUserFromIdTokenPayload } from "@/lib/auth/cognito/tokens";
import type { CognitoSessionUser } from "@/lib/auth/cognito/types";
import { MOMOS_BOOTSTRAP_SESSION_COOKIE } from "@/lib/bootstrap/config";
import {
  bootstrapSessionToCognitoUser,
  getBootstrapAdminSessionFromCookieValue,
} from "@/lib/bootstrap/guards";
import { enrichAuthUserFromDb } from "@/lib/auth/userAuthority";

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

/** Cognito JWT + DB enrichment, or verified bootstrap super-admin session. */
export async function getEnrichedSessionUserFromCookieStore(
  cookieStore: CookieStoreGet
): Promise<CognitoSessionUser | null> {
  const bootstrapTok = cookieStore.get(MOMOS_BOOTSTRAP_SESSION_COOKIE)?.value;
  const bootstrap = await getBootstrapAdminSessionFromCookieValue(bootstrapTok);
  if (bootstrap) {
    return bootstrapSessionToCognitoUser(bootstrap);
  }
  const base = getCognitoSessionUserFromCookieStore(cookieStore);
  if (!base) return null;
  return enrichAuthUserFromDb(base);
}
