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

  /** Public browser auth — must never hit `internalGate` (storefront users have no orchestration secret). */
  if (pathname.startsWith("/api/auth/cognito/")) {
    return NextResponse.next();
  }

  /**
   * Cognito JWT cookie gate for `/account`, `/admin`, `/super-admin`, optional `/portal`, `/ops`, `/api/ops`, etc.
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

  return internalGate(request);
}

export const config = {
  matcher: [
    "/api/auth/cognito/:path*",
    /**
     * Cognito-gated areas — when changing `COGNITO_PROTECTED_PREFIXES`, add matching prefixes here so middleware runs
     * before the internal orchestration secret gate (non-`/api` matcher paths return `NextResponse.next()`).
     */
    "/account/:path*",
    "/admin/:path*",
    "/super-admin/:path*",
    "/portal/:path*",
    "/ops/:path*",
    "/api/ops/:path*",
    "/api/orders/:path*",
    "/api/cart/:path*",
    "/api/fulfillment/:path*",
    "/api/square/catalog/sync",
    "/api/square/catalog/discovery",
    "/api/payments/:path*",
    "/api/email/send",
    "/api/email/send/:path*",
  ],
};
