import { decodeJwt } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  cookieHeaderIncludesRefreshToken,
  getCookieValueFromHeader,
  getSetCookieListFromHeaders,
  mergeCognitoCookiesFromSetCookie,
} from "@/lib/auth/cognito/cookieHeader";
import { cognitoIssuer, getCognitoConfig } from "@/lib/auth/cognito/config";
import { COGNITO_ID_TOKEN_COOKIE } from "@/lib/auth/cognito/sessionCookies";
import { issuerMatches, sessionUserFromIdTokenPayload } from "@/lib/auth/cognito/tokens";
import type { CognitoGroup } from "@/lib/auth/cognito/types";
import {
  defaultRouteForAuthority,
  hasRole,
  isAdmin,
  isCustomer,
  isSuperAdmin,
} from "@/lib/auth/cognito/roles";
import { getAuthzSource } from "@/lib/auth/userAuthority";
import type { ImpersonationPayload } from "@/lib/governance/impersonationToken";
import {
  delegatedStaffAuthorityGroups,
  jwtUserBindsVerifiedImpersonation,
  verifyImpersonationFromNextRequest,
} from "@/lib/auth/cognito/staffDelegatedAuthority";
import {
  bootstrapCognitoSubForEmail,
  MOMOS_BOOTSTRAP_SESSION_COOKIE,
} from "@/lib/bootstrap/config";
import { getBootstrapAdminSessionEdge } from "@/lib/bootstrap/guardsEdge";
import type { AuthUser } from "@/lib/auth/AuthProvider";

/**
 * Comma-separated path prefixes protected by Cognito **in addition to** `/api/ops/*` (always enforced for staff callers).
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
  if (pathname.startsWith("/api/ops")) return true;
  return cognitoProtectedPrefixes().some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function redirectToLogin(request: NextRequest): NextResponse {
  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

function redirectToRoleHome(
  request: NextRequest,
  authority: Parameters<typeof defaultRouteForAuthority>[0]
): NextResponse {
  return NextResponse.redirect(new URL(defaultRouteForAuthority(authority), request.url));
}

/** Edge cannot query Postgres — when `db`, middleware authenticates JWT only; layouts/API enforce roles. */
function middlewareEnforcesCognitoGroups(): boolean {
  return getAuthzSource() !== "db";
}

/** For server layouts: safe internal path + optional verified impersonation snapshot header for governance RSC. */
async function nextWithForwardedPath(
  request: NextRequest,
  cognito: DecodedCognito | null,
  impersonationVerified: ImpersonationPayload | null
): Promise<NextResponse> {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "x-momos-pathname",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  const authorityGroups = delegatedStaffAuthorityGroups(cognito?.user ?? null, impersonationVerified);
  if (
    cognito &&
    impersonationVerified &&
    jwtUserBindsVerifiedImpersonation(cognito.user, impersonationVerified) &&
    isSuperAdmin(authorityGroups)
  ) {
    requestHeaders.set("x-momos-impersonation", JSON.stringify(impersonationVerified));
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

type DecodedCognito = { user: NonNullable<ReturnType<typeof sessionUserFromIdTokenPayload>> };

function bootstrapAuthorityUser(session: { email: string; groups: string[] }): AuthUser {
  return {
    sub: bootstrapCognitoSubForEmail(session.email),
    username: session.email,
    email: session.email,
    groups: [...session.groups],
    role: "SuperAdmin",
    status: "Active",
    isBootstrapAdmin: true,
  };
}

async function decodeRequestBootstrapSession(
  request: NextRequest
): Promise<AuthUser | null> {
  const token = request.cookies.get(MOMOS_BOOTSTRAP_SESSION_COOKIE)?.value;
  const session = await getBootstrapAdminSessionEdge(token);
  if (!session) return null;
  return bootstrapAuthorityUser(session);
}

function decodeCognitoSessionFromIdToken(
  token: string | null | undefined,
  cfg: NonNullable<ReturnType<typeof getCognitoConfig>>
): DecodedCognito | null {
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

/** Parses ID JWT from cookie; roles from **`cognito:groups`** (`tokens.sessionUserFromIdTokenPayload`). */
function decodeRequestCognitoSession(
  request: NextRequest,
  cfg: NonNullable<ReturnType<typeof getCognitoConfig>>
): DecodedCognito | null {
  const token = request.cookies.get(COGNITO_ID_TOKEN_COOKIE)?.value;
  return decodeCognitoSessionFromIdToken(token, cfg);
}

function withRenewalHeaders(res: NextResponse, renewalCookies: string[]): NextResponse {
  for (const c of renewalCookies) {
    res.headers.append("Set-Cookie", c);
  }
  return res;
}

/**
 * When the ID token is expired but the refresh cookie is still valid, call the Node refresh route from the edge
 * middleware, then decode the rotated ID token. Response `Set-Cookie` headers are forwarded to the browser on the
 * outer `NextResponse` (`withRenewalHeaders`).
 */
async function resolveCognitoForMiddleware(
  request: NextRequest,
  cfg: NonNullable<ReturnType<typeof getCognitoConfig>>
): Promise<{ cognito: DecodedCognito | null; renewalCookies: string[] }> {
  let cognito = decodeRequestCognitoSession(request, cfg);
  if (cognito) {
    return { cognito, renewalCookies: [] };
  }

  const existingCookie = request.headers.get("cookie");
  if (!cookieHeaderIncludesRefreshToken(existingCookie)) {
    return { cognito: null, renewalCookies: [] };
  }

  const refreshUrl = new URL("/api/auth/cognito/refresh", request.nextUrl.origin);
  let refreshRes: Response;
  try {
    refreshRes = await fetch(refreshUrl, {
      method: "POST",
      headers: { cookie: existingCookie ?? "" },
    });
  } catch {
    return { cognito: null, renewalCookies: [] };
  }

  if (!refreshRes.ok) {
    return { cognito: null, renewalCookies: [] };
  }

  const setCookies = getSetCookieListFromHeaders(refreshRes.headers);
  const mergedCookieHeader = mergeCognitoCookiesFromSetCookie(existingCookie, setCookies);
  const idToken = getCookieValueFromHeader(mergedCookieHeader, COGNITO_ID_TOKEN_COOKIE);
  cognito = decodeCognitoSessionFromIdToken(idToken, cfg);
  if (!cognito) {
    return { cognito: null, renewalCookies: [] };
  }
  return { cognito, renewalCookies: setCookies };
}

function opsUnauthorizedApi(): NextResponse {
  return NextResponse.json({ error: "auth_required", code: "AUTH_REQUIRED" }, { status: 401 });
}

function cognitoUnconfiguredApi(): NextResponse {
  return NextResponse.json({ error: "cognito_unconfigured", code: "COGNITO_UNCONFIGURED" }, { status: 503 });
}

/** Middleware gate for Cognito JWT cookie across storefront account, admin surfaces, portal prefixes, and `/api/ops/*`. */
export async function cognitoGate(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const bootstrapUser = await decodeRequestBootstrapSession(request);
  const cfg = getCognitoConfig();
  const isApiOps = pathname.startsWith("/api/ops");

  if (bootstrapUser) {
    if (isApiOps) {
      if (!isAdmin(bootstrapUser)) {
        return opsUnauthorizedApi();
      }
      return nextWithForwardedPath(request, null, null);
    }

    if (pathname === "/account" || pathname.startsWith("/account/")) {
      return nextWithForwardedPath(request, null, null);
    }

    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      return nextWithForwardedPath(request, null, null);
    }

    if (pathname === "/super-admin" || pathname.startsWith("/super-admin/")) {
      return nextWithForwardedPath(request, null, null);
    }

    if (pathname === "/portal" || pathname.startsWith("/portal/")) {
      return nextWithForwardedPath(request, null, null);
    }

    return nextWithForwardedPath(request, null, null);
  }

  if (isApiOps) {
    if (!cfg) {
      return cognitoUnconfiguredApi();
    }
    const { cognito, renewalCookies } = await resolveCognitoForMiddleware(request, cfg);
    const impersonationVerified =
      cognito ? await verifyImpersonationFromNextRequest(request) : null;
    if (!cognito) {
      return withRenewalHeaders(opsUnauthorizedApi(), renewalCookies);
    }
    if (middlewareEnforcesCognitoGroups()) {
      const authorityGroups = delegatedStaffAuthorityGroups(cognito.user, impersonationVerified);
      if (!isAdmin(authorityGroups)) {
        return withRenewalHeaders(opsUnauthorizedApi(), renewalCookies);
      }
    }
    return withRenewalHeaders(
      await nextWithForwardedPath(request, cognito, impersonationVerified),
      renewalCookies
    );
  }

  if (!cfg) {
    return new NextResponse("Cognito auth is not configured (missing env).", { status: 503 });
  }

  const { cognito, renewalCookies } = await resolveCognitoForMiddleware(request, cfg);
  const impersonationVerified =
    cognito ? await verifyImpersonationFromNextRequest(request) : null;
  const authorityGroups = delegatedStaffAuthorityGroups(cognito?.user ?? null, impersonationVerified);

  if (!middlewareEnforcesCognitoGroups()) {
    if (!cognito) {
      return withRenewalHeaders(redirectToLogin(request), renewalCookies);
    }
    return withRenewalHeaders(
      await nextWithForwardedPath(request, cognito, impersonationVerified),
      renewalCookies
    );
  }

  if (pathname === "/account" || pathname.startsWith("/account/")) {
    if (cognito) {
      const subject = cognito.user;
      if (isCustomer(subject)) {
        return withRenewalHeaders(
          await nextWithForwardedPath(request, cognito, impersonationVerified),
          renewalCookies
        );
      }
      if (isSuperAdmin(subject)) {
        return withRenewalHeaders(
          await nextWithForwardedPath(request, cognito, impersonationVerified),
          renewalCookies
        );
      }
      if (isAdmin(subject)) {
        return withRenewalHeaders(redirectToRoleHome(request, subject), renewalCookies);
      }
      return withRenewalHeaders(redirectToLogin(request), renewalCookies);
    }
    return withRenewalHeaders(redirectToLogin(request), renewalCookies);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!cognito) {
      return withRenewalHeaders(redirectToLogin(request), renewalCookies);
    }
    const subject = cognito.user;
    if (isAdmin(authorityGroups)) {
      return withRenewalHeaders(
        await nextWithForwardedPath(request, cognito, impersonationVerified),
        renewalCookies
      );
    }
    if (isCustomer(subject)) {
      return withRenewalHeaders(NextResponse.redirect(new URL("/account", request.url)), renewalCookies);
    }
    return withRenewalHeaders(redirectToLogin(request), renewalCookies);
  }

  if (pathname === "/super-admin" || pathname.startsWith("/super-admin/")) {
    if (!cognito) {
      return withRenewalHeaders(redirectToLogin(request), renewalCookies);
    }
    const subject = cognito.user;
    if (isSuperAdmin(authorityGroups)) {
      return withRenewalHeaders(
        await nextWithForwardedPath(request, cognito, impersonationVerified),
        renewalCookies
      );
    }
    if (hasRole(subject, "admin")) {
      return withRenewalHeaders(NextResponse.redirect(new URL("/admin", request.url)), renewalCookies);
    }
    if (isCustomer(subject)) {
      return withRenewalHeaders(NextResponse.redirect(new URL("/account", request.url)), renewalCookies);
    }
    return withRenewalHeaders(redirectToLogin(request), renewalCookies);
  }

  if (!cognito) {
    return withRenewalHeaders(redirectToLogin(request), renewalCookies);
  }
  return withRenewalHeaders(
    await nextWithForwardedPath(request, cognito, impersonationVerified),
    renewalCookies
  );
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
