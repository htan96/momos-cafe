import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cognitoGate, isCognitoProtectedPath } from "@/lib/auth/cognito/guards";
import { INTERNAL_SECRET_HEADER } from "@/lib/server/orchestrationConstants";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/**
 * Browser-facing storefront endpoints must not sit behind INTERNAL_API_SECRET
 * (only server jobs / orchestration use that gate).
 */
function isPublicStorefrontApi(pathname: string): boolean {
  if (pathname === "/api/orders" || pathname.startsWith("/api/orders/")) return true;
  if (pathname === "/api/cart" || pathname.startsWith("/api/cart/")) return true;
  return false;
}

/**
 * API routes that MUST present `INTERNAL_API_SECRET` when matched by middleware.
 * Keep narrow: other `/api/*` paths authenticate in route handlers (Cognito, Square, etc.).
 */
function requiresInternalOrchestrationSecret(pathname: string): boolean {
  if (pathname === "/api/fulfillment" || pathname.startsWith("/api/fulfillment/")) return true;
  if (pathname === "/api/payments" || pathname.startsWith("/api/payments/")) return true;
  if (pathname === "/api/email/send" || pathname.startsWith("/api/email/send/")) return true;
  if (pathname.startsWith("/api/internal/")) return true;
  if (pathname === "/api/square/catalog/sync" || pathname === "/api/square/catalog/discovery") {
    return true;
  }
  return false;
}

/** Internal orchestration guard — Bearer token OR custom header must match `INTERNAL_API_SECRET`. */
function internalGate(request: NextRequest): NextResponse {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret || secret.length < 24) {
    console.error("[orchestration] INTERNAL_API_SECRET missing or shorter than 24 chars");
    return NextResponse.json(
      { error: "service_unconfigured", code: "INTERNAL_SECRET_MISSING" },
      { status: 503 }
    );
  }

  const bearer = request.headers.get("authorization");
  const rawHeader = request.headers.get(INTERNAL_SECRET_HEADER);
  const bearerToken =
    bearer?.startsWith("Bearer ") ? bearer.slice("Bearer ".length).trim() : null;
  const candidate = bearerToken ?? rawHeader?.trim() ?? "";

  if (!timingSafeEqual(candidate, secret)) {
    return NextResponse.json(
      { error: "unauthorized", code: "INTERNAL_AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  const res = NextResponse.next();
  res.headers.set("x-momos-orchestration", "1");
  return res;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  /**
   * Link-in-bio: any casing of `/links` (LINKS, Links, …) → canonical `/links`
   * so View Menu / Directions / Instagram always load.
   */
  const linksPath = pathname.replace(/\/+$/, "") || "/";
  if (linksPath.toLowerCase() === "/links") {
    if (pathname !== "/links") {
      const url = request.nextUrl.clone();
      url.pathname = "/links";
      return NextResponse.redirect(url, 308);
    }
    return NextResponse.next();
  }

  /** Bare `/api` can match the single-segment links matcher — never treat it as orchestration. */
  if (pathname === "/api" || pathname === "/api/") {
    return NextResponse.next();
  }

  /**
   * Public browser auth — must never hit `internalGate`
   * (sessions, signup, OAuth-style flows have no orchestration secret).
   */
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  /**
   * Super-admin REST surface — guarded in handlers (`requireSuperStaff*`); never internal-secret gated.
   * (Page routes use `/super-admin/*` Cognito matcher; `/api/super-admin/*` is not a `cognitoProtectedPrefixes` path.)
   */
  if (pathname === "/api/super-admin" || pathname.startsWith("/api/super-admin/")) {
    return NextResponse.next();
  }

  /**
   * Cognito-gated routes: validates **ID token** JWT (issuer + exp). When `AUTHZ_SOURCE=db`, edge does not read
   * Postgres — role/status checks run in layouts and API handlers (`getCognitoServerSession` + `users` table).
   * When `AUTHZ_SOURCE=dual|cognito`, middleware also enforces `cognito:groups` (or dual mismatch logs).
   */
  if (isCognitoProtectedPath(pathname)) {
    if (process.env.COGNITO_GATE_DEBUG === "1") {
      console.info("[cognito-gate] pathname", pathname);
    }
    return await cognitoGate(request);
  }

  if (isPublicStorefrontApi(pathname)) {
    return NextResponse.next();
  }

  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (requiresInternalOrchestrationSecret(pathname)) {
    return internalGate(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/auth/:path*",
    /**
     * Cognito-gated areas — when changing `COGNITO_PROTECTED_PREFIXES`, add matching prefixes here so middleware runs
     * before any other checks (non-`/api` matcher paths return `NextResponse.next()` when not cognito-guarded).
     */
    "/account/:path*",
    "/admin/:path*",
    "/super-admin/:path*",
    "/portal/:path*",
    "/api/ops/:path*",
    "/api/orders/:path*",
    "/api/cart/:path*",
    "/api/fulfillment/:path*",
    "/api/square/catalog/sync",
    "/api/square/catalog/discovery",
    "/api/payments/:path*",
    "/api/email/send",
    "/api/email/send/:path*",
    "/api/internal/email/ses-smoke-send",
    "/api/internal/webhooks/ses-notification",
    /**
     * Single-segment paths — runs the case-insensitive `/links` normalizer
     * (`/LINKS`, `/Links`, etc. → `/links`).
     */
    "/:segment",
    "/:segment/",
  ],
};
