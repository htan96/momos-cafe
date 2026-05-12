import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { INTERNAL_SECRET_HEADER } from "@/lib/server/orchestrationConstants";
import {
  OPS_SESSION_COOKIE,
  opsSigningKeyMaterial,
  verifyOpsSessionToken,
} from "@/lib/ops/sessionCrypto";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function opsGate(request: NextRequest): Promise<NextResponse> {
  const signingReady = opsSigningKeyMaterial();
  if (!signingReady) {
    console.error("[ops] OPS_SESSION_SECRET missing or shorter than 24 chars");
    const pathname = request.nextUrl.pathname;
    if (pathname.startsWith("/api/ops")) {
      return NextResponse.json({ error: "ops_unconfigured", code: "OPS_SECRET_MISSING" }, { status: 503 });
    }
    return new NextResponse("Ops console unconfigured", { status: 503 });
  }

  const token = request.cookies.get(OPS_SESSION_COOKIE)?.value;
  const session = await verifyOpsSessionToken(token);
  if (!session) {
    const pathname = request.nextUrl.pathname;
    if (pathname.startsWith("/api/ops")) {
      return NextResponse.json({ error: "ops_unauthorized", code: "OPS_AUTH_REQUIRED" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
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

  if (pathname === "/ops/login" || pathname.startsWith("/ops/login/")) {
    return NextResponse.next();
  }

  if (pathname === "/api/ops/auth/login" || pathname === "/api/ops/auth/logout") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/ops") || pathname.startsWith("/api/ops")) {
    return opsGate(request);
  }

  return internalGate(request);
}

export const config = {
  matcher: [
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
