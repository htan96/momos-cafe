/**
 * Cookie names use an app-specific prefix to avoid collisions with third-party cookies.
 *
 * Tradeoffs (Next.js App Router):
 * - **httpOnly JWT cookies (this module)** keep tokens off `document.cookie` and reduce XSS blast radius.
 *   Downside: large headers, per-tab logout nuance, and you must treat refresh tokens as secrets (still httpOnly).
 * - **Encrypted server-only session** (e.g. seal cookies with `COGNITO_SESSION_SECRET`) keeps a single opaque cookie
 *   and can store refresh server-side — best when you need revocation lists or token rotation without exposing RT.
 *   Downside: more moving parts (encryption, rotation, size limits).
 *
 * This phase stores **id + access + refresh** as separate httpOnly cookies; refresh never leaves the server boundary
 * to client JS because APIs set/read them.
 */

export const COGNITO_ID_TOKEN_COOKIE = "momos_cognito_id";
export const COGNITO_ACCESS_TOKEN_COOKIE = "momos_cognito_access";
export const COGNITO_REFRESH_TOKEN_COOKIE = "momos_cognito_refresh";

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export type CognitoCookieAttrs = {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  secure: boolean;
  maxAge?: number;
};

export function cognitoCookieBase(): Omit<CognitoCookieAttrs, "maxAge"> {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction(),
  };
}

export function clearCognitoCookieJar(res: { cookies: { delete: (name: string) => void } }): void {
  res.cookies.delete(COGNITO_ID_TOKEN_COOKIE);
  res.cookies.delete(COGNITO_ACCESS_TOKEN_COOKIE);
  res.cookies.delete(COGNITO_REFRESH_TOKEN_COOKIE);
}
