import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { INTERNAL_SECRET_HEADER } from "@/lib/server/orchestrationConstants";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/**
 * Internal orchestration guard — Bearer token OR custom header must match `INTERNAL_API_SECRET`.
 * Webhooks (`/api/webhooks/*`) and Resend inbound (`/api/email/inbound`) are excluded; they authenticate separately.
 */
export function middleware(request: NextRequest) {
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

export const config = {
  matcher: [
    "/api/orders/:path*",
    "/api/cart/:path*",
    "/api/checkout/:path*",
    "/api/fulfillment/:path*",
    "/api/square/catalog/sync",
    "/api/payments/:path*",
    "/api/email/send",
    "/api/email/send/:path*",
  ],
};
