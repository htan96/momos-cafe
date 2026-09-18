import { cookies } from "next/headers";

import {
  bootstrapAdminAuthEnabled,
  MOMOS_BOOTSTRAP_PENDING_COOKIE,
  normalizedBootstrapAdminEmail,
} from "@/lib/bootstrap/config";
import { emitBootstrapOperationalEvent } from "@/lib/bootstrap/events";
import {
  attachBootstrapSession,
  bootstrapJson,
  bootstrapRateLimited,
  bootstrapUnauthorized,
} from "@/lib/bootstrap/http";
import { ensureBootstrapSuperAdminUser } from "@/lib/bootstrap/profile";
import { unsealBootstrapPending } from "@/lib/bootstrap/pending";
import { bootstrapTotpRateAllowed } from "@/lib/bootstrap/rateLimit";
import { readBootstrapPlainTotpSecret } from "@/lib/bootstrap/store";
import { verifyBootstrapTotpCode } from "@/lib/bootstrap/totp";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { OperationalActivitySeverity } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  if (!bootstrapAdminAuthEnabled()) {
    return bootstrapJson({ error: "bootstrap_disabled" }, 403);
  }

  const emailNorm = normalizedBootstrapAdminEmail()!;
  if (!bootstrapTotpRateAllowed(request, emailNorm)) {
    return bootstrapRateLimited();
  }

  const ck = await cookies();
  const pending = await unsealBootstrapPending(
    ck.get(MOMOS_BOOTSTRAP_PENDING_COOKIE)?.value
  );
  if (!pending || pending.phase !== "password_ok") {
    await emitBootstrapOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.BOOTSTRAP_TOTP_FAILED,
      severity: OperationalActivitySeverity.warning,
      message: "Bootstrap TOTP verify failed — invalid pending session",
    });
    return bootstrapUnauthorized();
  }

  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return bootstrapUnauthorized();
  }

  const code = typeof body.code === "string" ? body.code : "";
  const secret = await readBootstrapPlainTotpSecret();
  if (!secret?.length) {
    return bootstrapUnauthorized();
  }

  const valid = await verifyBootstrapTotpCode(secret, code);
  if (!valid) {
    await emitBootstrapOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.BOOTSTRAP_TOTP_FAILED,
      severity: OperationalActivitySeverity.warning,
      message: "Bootstrap TOTP verify failed — invalid code",
    });
    return bootstrapJson({ error: "invalid_totp" }, 401);
  }

  await ensureBootstrapSuperAdminUser();

  const res = bootstrapJson({ ok: true, redirect: "/super-admin" });
  const sessionRes = await attachBootstrapSession(res, emailNorm);

  await emitBootstrapOperationalEvent({
    type: OPERATIONAL_EVENT_TYPES.BOOTSTRAP_LOGIN_SUCCESS,
    message: "Bootstrap super-admin signed in",
  });

  return sessionRes;
}
