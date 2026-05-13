import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeAuthEmail, safeAuthRedirectPath } from "@/lib/auth/emailNormalize";
import { isOpsPasswordLoginEmail } from "@/lib/auth/opsPasswordEmails";
import { generateOpaqueTokenHex, sha256Hex } from "@/lib/auth/tokenHash";
import { sendCustomerMagicLinkEmail } from "@/lib/auth/sendMagicLinkEmail";
import { getAuthPublicBaseUrl } from "@/lib/auth/publicBaseUrl";
import { rateLimitHit, clientIp } from "@/lib/server/rateLimitMemory";
import { customerSigningKeyMaterial } from "@/lib/auth/customerSessionCrypto";

/**
 * Email sign-in step 1 (see `/login/email`) — ops-eligible emails get password UI (`/api/ops/auth/login`);
 * everyone else receives a Resend magic link (customer session).
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (rateLimitHit(`auth:start:${ip}`, { windowMs: 60_000, max: 12 })) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { email?: string; next?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const emailRaw = body.email ?? "";
  const emailNorm = normalizeAuthEmail(emailRaw);
  if (!emailNorm || !emailNorm.includes("@")) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const next = safeAuthRedirectPath(body.next ?? null, "/account");

  if (isOpsPasswordLoginEmail(emailNorm)) {
    return NextResponse.json({
      ok: true,
      mode: "password_required",
      next,
    });
  }

  const base = getAuthPublicBaseUrl();
  if (!base) {
    console.error("[auth/start] AUTH_PUBLIC_BASE_URL or NEXT_PUBLIC_SITE_URL required for magic links");
    return NextResponse.json({ error: "auth_url_unconfigured" }, { status: 503 });
  }

  if (!customerSigningKeyMaterial()) {
    console.error("[auth/start] CUSTOMER_SESSION_SECRET missing — cannot complete magic-link sign-in");
    return NextResponse.json({ error: "customer_session_unconfigured" }, { status: 503 });
  }

  const rawToken = generateOpaqueTokenHex(32);
  const tokenHash = await sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  try {
    await prisma.authMagicLinkToken.create({
      data: {
        emailNorm,
        tokenHash,
        expiresAt,
      },
    });
  } catch (e) {
    console.error("[auth/start] token persist failed", e);
    return NextResponse.json({ error: "token_create_failed" }, { status: 500 });
  }

  const magicUrl = new URL("/api/auth/magic", base);
  magicUrl.searchParams.set("token", rawToken);
  magicUrl.searchParams.set("next", next);

  const sent = await sendCustomerMagicLinkEmail({
    to: emailNorm,
    magicUrl: magicUrl.toString(),
  });

  if (!sent.ok) {
    await prisma.authMagicLinkToken.deleteMany({ where: { tokenHash } }).catch(() => {});
    return NextResponse.json({ error: "email_send_failed" }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    mode: "magic_link_sent",
    next,
  });
}
