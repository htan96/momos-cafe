import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeAuthRedirectPath } from "@/lib/auth/emailNormalize";
import {
  CUSTOMER_SESSION_COOKIE,
  signCustomerSessionPayload,
} from "@/lib/auth/customerSessionCrypto";
import { sha256Hex } from "@/lib/auth/tokenHash";
import { rateLimitHit, clientIp } from "@/lib/server/rateLimitMemory";

function failRedirect(reqUrl: string, code: string): NextResponse {
  const u = new URL(reqUrl);
  u.pathname = "/login";
  u.search = "";
  u.searchParams.set("error", code);
  return NextResponse.redirect(u);
}

/** Consume one-time token, upsert customer row, set `MOMOS_CUSTOMER` cookie. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tokenRaw = url.searchParams.get("token")?.trim();
  const next = safeAuthRedirectPath(url.searchParams.get("next"), "/account");

  if (!tokenRaw) return failRedirect(req.url, "missing_token");

  const ip = clientIp(req);
  if (rateLimitHit(`auth:magic:${ip}`, { windowMs: 60_000, max: 40 })) {
    return failRedirect(req.url, "rate_limited");
  }

  const tokenHash = await sha256Hex(tokenRaw);
  const row = await prisma.authMagicLinkToken.findUnique({ where: { tokenHash } });

  if (!row || row.consumedAt || row.expiresAt < new Date()) {
    return failRedirect(req.url, "link_invalid");
  }

  const customerId = await prisma.$transaction(async (tx) => {
    const consumed = await tx.authMagicLinkToken.updateMany({
      where: {
        id: row.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) return null;

    const customer = await tx.customer.upsert({
      where: { email: row.emailNorm },
      create: { email: row.emailNorm },
      update: {},
    });

    const rawMeta = customer.authMetadata;
    const meta =
      rawMeta && typeof rawMeta === "object" && !Array.isArray(rawMeta)
        ? (rawMeta as Record<string, unknown>)
        : {};

    await tx.customer.update({
      where: { id: customer.id },
      data: {
        authMetadata: {
          ...meta,
          lastMagicLoginAt: new Date().toISOString(),
        },
      },
    });

    return customer.id;
  });

  if (!customerId) {
    return failRedirect(req.url, "link_invalid");
  }

  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  const sessionToken = await signCustomerSessionPayload({
    typ: "customer",
    sub: customerId,
    email: row.emailNorm,
    exp,
  });

  if (!sessionToken) {
    console.error("[auth/magic] CUSTOMER_SESSION_SECRET missing or invalid");
    return failRedirect(req.url, "session_unconfigured");
  }

  const dest = new URL(next, url.origin);
  const res = NextResponse.redirect(dest);
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(CUSTOMER_SESSION_COOKIE, sessionToken, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
