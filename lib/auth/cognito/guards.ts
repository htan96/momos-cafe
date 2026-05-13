import { decodeJwt } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCognitoConfig, cognitoIssuer } from "@/lib/auth/cognito/config";
import { COGNITO_ID_TOKEN_COOKIE } from "@/lib/auth/cognito/sessionCookies";
import { issuerMatches, sessionUserFromIdTokenPayload } from "@/lib/auth/cognito/tokens";
import type { CognitoGroup } from "@/lib/auth/cognito/types";
import { hasRole } from "@/lib/auth/cognito/roles";

/**
 * Comma-separated path prefixes protected by Cognito **in addition to** existing middleware gates.
 * Defaults to `/portal` as a sample employee-only subtree — adjust to match your routes.
 */
export function cognitoProtectedPrefixes(): string[] {
  const raw = process.env.COGNITO_PROTECTED_PREFIXES;
  if (raw !== undefined && raw.trim() === "") return [];
  const trimmed = raw?.trim();
  const parts = trimmed && trimmed.length > 0 ? trimmed.split(",") : ["/portal"];
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function isCognitoProtectedPath(pathname: string): boolean {
  return cognitoProtectedPrefixes().some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function redirectToCognitoLogin(request: NextRequest): NextResponse {
  const login = new URL("/auth/cognito/login", request.url);
  login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

/**
 * Lightweight Edge-safe gate: decode JWT from httpOnly id-token cookie, validate issuer + expiry.
 * Does **not** verify signatures — see `lib/auth/cognito/tokens.ts`.
 */
export function cognitoGate(request: NextRequest): NextResponse {
  const cfg = getCognitoConfig();
  if (!cfg) {
    return new NextResponse("Cognito auth is not configured (missing env).", { status: 503 });
  }

  const token = request.cookies.get(COGNITO_ID_TOKEN_COOKIE)?.value;
  if (!token) {
    return redirectToCognitoLogin(request);
  }

  try {
    const payload = decodeJwt(token);
    if (!issuerMatches(cfg, payload.iss)) {
      return redirectToCognitoLogin(request);
    }
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < now - 30) {
      return redirectToCognitoLogin(request);
    }
  } catch {
    return redirectToCognitoLogin(request);
  }

  return NextResponse.next();
}

/**
 * Optional group enforcement for route handlers or server components (decode token again there).
 */
export function requireCognitoGroup(
  request: NextRequest,
  role: CognitoGroup
): NextResponse | null {
  const cfg = getCognitoConfig();
  if (!cfg) {
    return NextResponse.json({ error: "cognito_unconfigured" }, { status: 503 });
  }

  const token = request.cookies.get(COGNITO_ID_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  try {
    const payload = decodeJwt(token);
    if (!issuerMatches(cfg, payload.iss)) {
      return NextResponse.json({ error: "bad_token_issuer" }, { status: 401 });
    }
    const user = sessionUserFromIdTokenPayload(payload);
    if (!user || !hasRole(user.groups, role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return null;
  } catch {
    return NextResponse.json({ error: "bad_token" }, { status: 401 });
  }
}

/** Expose issuer string for JWKS implementations that prefer explicit wiring. */
export function expectedCognitoIssuer(): string | null {
  const cfg = getCognitoConfig();
  return cfg ? cognitoIssuer(cfg) : null;
}
