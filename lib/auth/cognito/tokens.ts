import type { JWTPayload } from "jose";
import { decodeJwt } from "jose";
import type { CognitoEnvConfig } from "@/lib/auth/cognito/config";
import { cognitoIssuer } from "@/lib/auth/cognito/config";
import type { CognitoSessionUser } from "@/lib/auth/cognito/types";

/**
 * JWKS signature verification against `/.well-known/jwks.json` is intentionally deferred — middleware runs on Edge,
 * decoding is intentionally lightweight. Prefer verifying in API Routes via `GetUser` (access token) or `jwtVerify`.
 *
 * Middleware today enforces issuer + expiry by decoding payload only (`decodeJwt`); treat that as UX gating — not proof
 * the token hasn't been forged. For authoritative checks, validate server-side (`GetUser` or JWKS verification).
 */

export function parseGroupsFromPayload(payload: JWTPayload): string[] {
  const g = payload["cognito:groups"];
  if (Array.isArray(g)) return g.filter((x): x is string => typeof x === "string");
  if (typeof g === "string") return [g];
  return [];
}

export function sessionUserFromIdTokenPayload(payload: JWTPayload): CognitoSessionUser | null {
  const sub = typeof payload.sub === "string" ? payload.sub : null;
  if (!sub) return null;
  const username =
    typeof payload["cognito:username"] === "string"
      ? payload["cognito:username"]
      : typeof payload["username"] === "string"
        ? payload["username"]
        : sub;
  const email = typeof payload.email === "string" ? payload.email : null;
  return { sub, username, email, groups: parseGroupsFromPayload(payload) };
}

export function decodeCognitoIdTokenUnsafe(token: string): CognitoSessionUser | null {
  try {
    const payload = decodeJwt(token);
    return sessionUserFromIdTokenPayload(payload);
  } catch {
    return null;
  }
}

export function issuerMatches(config: CognitoEnvConfig, iss: unknown): boolean {
  return iss === cognitoIssuer(config);
}

export function jwtMaxAgeSeconds(token: string): number | undefined {
  try {
    const { exp } = decodeJwt(token);
    if (!exp || typeof exp !== "number") return undefined;
    const now = Math.floor(Date.now() / 1000);
    const secs = exp - now - 60;
    return secs > 0 ? secs : 300;
  } catch {
    return undefined;
  }
}
