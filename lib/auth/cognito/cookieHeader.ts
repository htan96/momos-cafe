import {
  COGNITO_ACCESS_TOKEN_COOKIE,
  COGNITO_ID_TOKEN_COOKIE,
  COGNITO_REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/cognito/sessionCookies";

const COGNITO_COOKIE_NAMES = new Set([
  COGNITO_ID_TOKEN_COOKIE,
  COGNITO_ACCESS_TOKEN_COOKIE,
  COGNITO_REFRESH_TOKEN_COOKIE,
]);

export function getCookieValueFromHeader(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const segment of cookieHeader.split(/;\s*/)) {
    const idx = segment.indexOf("=");
    if (idx <= 0) continue;
    const segName = segment.slice(0, idx);
    if (segName !== name) continue;
    return segment.slice(idx + 1);
  }
  return null;
}

/** Prefer `Headers#getSetCookie` when available (multiple `Set-Cookie` headers). */
export function getSetCookieListFromHeaders(headers: Headers): string[] {
  const withFn = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withFn.getSetCookie === "function") {
    return withFn.getSetCookie();
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

/**
 * Applies `Set-Cookie` name/value pairs onto an existing `Cookie` request header.
 * Only Cognito token cookies are updated; other cookies are preserved.
 */
export function mergeCognitoCookiesFromSetCookie(
  existingCookieHeader: string | null,
  setCookieHeaders: string[]
): string {
  const map = new Map<string, string>();
  if (existingCookieHeader) {
    for (const segment of existingCookieHeader.split(/;\s*/)) {
      const idx = segment.indexOf("=");
      if (idx <= 0) continue;
      const segName = segment.slice(0, idx);
      map.set(segName, segment.slice(idx + 1));
    }
  }
  for (const sc of setCookieHeaders) {
    const firstPart = sc.split(";")[0]?.trim() ?? "";
    const idx = firstPart.indexOf("=");
    if (idx <= 0) continue;
    const name = firstPart.slice(0, idx);
    const value = firstPart.slice(idx + 1);
    if (COGNITO_COOKIE_NAMES.has(name)) {
      map.set(name, value);
    }
  }
  return [...map.entries()].map(([n, v]) => `${n}=${v}`).join("; ");
}

export function cookieHeaderIncludesRefreshToken(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.includes(`${COGNITO_REFRESH_TOKEN_COOKIE}=`);
}
