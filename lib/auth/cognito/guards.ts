import { decodeJwt } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCognitoConfig, cognitoIssuer } from "@/lib/auth/cognito/config";
import { COGNITO_ID_TOKEN_COOKIE } from "@/lib/auth/cognito/sessionCookies";
import { issuerMatches, sessionUserFromIdTokenPayload } from "@/lib/auth/cognito/tokens";
import type { CognitoGroup } from "@/lib/auth/cognito/types";
import {
  defaultRouteForGroups,
  hasRole,
  isAdmin,
  isCustomer,
  isSuperAdmin,
} from "@/lib/auth/cognito/roles";

/**
 * Comma-separated path prefixes protected by Cognito **in addition to** `/ops` and `/api/ops` (always enforced).
 * Defaults to `/account`, `/admin`, and `/super-admin` (plus any extra entries such as `/portal` from env).
 */
export function cognitoProtectedPrefixes(): string[] {
  const raw = process.env.COGNITO_PROTECTED_PREFIXES;
  if (raw !== undefined && raw.trim() === "") return [];
  const trimmed = raw?.trim();
  const parts =
    trimmed && trimmed.length > 0 ? trimmed.split(",") : ["/account", "/admin", "/super-admin"];
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function isCognitoProtectedPath(pathname: string): boolean {
  if (pathname.startsWith("/ops") || pathname.startsWith("/api/ops")) return true;
  return cognitoProtectedPrefixes().some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function redirectToLogin(request: NextRequest): NextResponse {
  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

function redirectToRoleHome(request: NextRequest, groups: readonly string[]): NextResponse {
  return NextResponse.redirect(new URL(defaultRouteForGroups(groups), request.url));
}

type DecodedCognito = { user: NonNullable<ReturnType<typeof sessionUserFromIdTokenPayload>> };

function decodeRequestCognitoSession(
  request: NextRequest,
  cfg: NonNullable<ReturnType<typeof getCognitoConfig>>
): DecodedCognito | null {
  const token = request.cookies.get(COGNITO_ID_TOKEN_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = decodeJwt(token);
    if (!issuerMatches(cfg, payload.iss)) return null;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < now - 30) return null;
    const user = sessionUserFromIdTokenPayload(payload);
    if (!user) return null;
    return { user };
  } catch {
    return null;
  }
}

function opsUnauthorizedApi(): NextResponse {
  return NextResponse.json({ error: "auth_required", code: "AUTH_REQUIRED" }, { status: 401 });
}

function cognitoUnconfiguredApi(): NextResponse {
  return NextResponse.json({ error: "cognito_unconfigured", code: "COGNITO_UNCONFIGURED" }, { status: 503 });
}

/** Middleware gate for Cognito JWT cookie across storefront account, admin surfaces, portal prefixes, and ops. */
export async function cognitoGate(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const cfg = getCognitoConfig();
  const isApiOps = pathname.startsWith("/api/ops");

  if (pathname.startsWith("/ops") || isApiOps) {
    if (!cfg) {
      return isApiOps ? cognitoUnconfiguredApi() : new NextResponse("Cognito auth is not configured.", { status: 503 });
    }
    const cognito = decodeRequestCognitoSession(request, cfg);
    if (!cognito || !isAdmin(cognito.user.groups)) {
      return isApiOps ? opsUnauthorizedApi() : redirectToLogin(request);
    }
    return NextResponse.next();
  }

  if (!cfg) {
    return new NextResponse("Cognito auth is not configured (missing env).", { status: 503 });
  }

  if (pathname === "/account" || pathname.startsWith("/account/")) {
    const cognito = decodeRequestCognitoSession(request, cfg);
    if (cognito) {
      const { groups } = cognito.user;
      if (isCustomer(groups)) {
        return NextResponse.next();
      }
      if (isAdmin(groups)) {
        return redirectToRoleHome(request, groups);
      }
      return redirectToLogin(request);
    }
    return redirectToLogin(request);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const cognito = decodeRequestCognitoSession(request, cfg);
    if (!cognito) {
      return redirectToLogin(request);
    }
    const { groups } = cognito.user;
    if (isAdmin(groups)) {
      return NextResponse.next();
    }
    if (isCustomer(groups)) {
      return NextResponse.redirect(new URL("/account", request.url));
    }
    return redirectToLogin(request);
  }

  if (pathname === "/super-admin" || pathname.startsWith("/super-admin/")) {
    const cognito = decodeRequestCognitoSession(request, cfg);
    if (!cognito) {
      return redirectToLogin(request);
    }
    const { groups } = cognito.user;
    if (isSuperAdmin(groups)) {
      return NextResponse.next();
    }
    if (hasRole(groups, "admin")) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (isCustomer(groups)) {
      return NextResponse.redirect(new URL("/account", request.url));
    }
    return redirectToLogin(request);
  }

  const cognito = decodeRequestCognitoSession(request, cfg);
  if (!cognito) {
    return redirectToLogin(request);
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
