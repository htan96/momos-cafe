import { NextResponse } from "next/server";

import {
  MOMOS_BOOTSTRAP_PENDING_COOKIE,
  bootstrapPendingMaxAgeSec,
} from "@/lib/bootstrap/config";
import {
  clearPendingCookie,
  pendingCookieOptions,
  sealBootstrapPending,
  type BootstrapPendingClaims,
} from "@/lib/bootstrap/pending";
import {
  clearBootstrapSessionCookie,
  sealBootstrapAdminSession,
  setBootstrapSessionCookie,
} from "@/lib/bootstrap/session";

export function bootstrapJson(
  body: Record<string, unknown>,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function attachBootstrapPending(
  res: NextResponse,
  claims: BootstrapPendingClaims
): Promise<NextResponse> {
  const token = await sealBootstrapPending(claims);
  res.cookies.set(
    MOMOS_BOOTSTRAP_PENDING_COOKIE,
    token,
    pendingCookieOptions(bootstrapPendingMaxAgeSec())
  );
  return res;
}

export async function attachBootstrapSession(
  res: NextResponse,
  email: string
): Promise<NextResponse> {
  const token = await sealBootstrapAdminSession(email);
  setBootstrapSessionCookie(res, token);
  clearPendingCookie(res);
  return res;
}

export function bootstrapUnauthorized(): NextResponse {
  return bootstrapJson({ error: "invalid_credentials" }, 401);
}

export function bootstrapRateLimited(): NextResponse {
  return bootstrapJson({ error: "rate_limited" }, 429);
}

export function clearBootstrapAuthCookies(res: NextResponse): NextResponse {
  clearBootstrapSessionCookie(res);
  clearPendingCookie(res);
  return res;
}
