import { NextResponse } from "next/server";

import {
  bootstrapAdminAuthEnabled,
  isBootstrapAdminEmail,
  normalizedBootstrapAdminEmail,
} from "@/lib/bootstrap/config";
import { emitBootstrapOperationalEvent } from "@/lib/bootstrap/events";
import {
  attachBootstrapPending,
  bootstrapJson,
  bootstrapRateLimited,
  bootstrapUnauthorized,
} from "@/lib/bootstrap/http";
import { timingSafeEqualUtf8 } from "@/lib/bootstrap/password";
import { bootstrapLoginRateAllowed } from "@/lib/bootstrap/rateLimit";
import {
  generateBootstrapRecoveryCodes,
  hashBootstrapRecoveryCodes,
} from "@/lib/bootstrap/recoveryCodes";
import {
  bootstrapTotpIsEnabled,
  loadBootstrapAuthRow,
  upsertBootstrapPendingSecret,
} from "@/lib/bootstrap/store";
import { bootstrapQrDataUrl, createBootstrapTotpSecret } from "@/lib/bootstrap/totp";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { OperationalActivitySeverity } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MAX_BODY = 16_384;

export async function POST(request: Request) {
  if (!bootstrapAdminAuthEnabled()) {
    return bootstrapJson({ error: "bootstrap_disabled" }, 403);
  }

  const cl = request.headers.get("content-length");
  if (cl && Number.isFinite(Number(cl)) && Number(cl) > MAX_BODY) {
    return bootstrapJson({ error: "payload_too_large" }, 413);
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    await emitBootstrapOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.BOOTSTRAP_LOGIN_FAILED,
      severity: OperationalActivitySeverity.warning,
      message: "Bootstrap login failed — invalid JSON body",
    });
    return bootstrapUnauthorized();
  }

  const emailRaw = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!emailRaw.length || !password.length) {
    await emitBootstrapOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.BOOTSTRAP_LOGIN_FAILED,
      severity: OperationalActivitySeverity.warning,
      message: "Bootstrap login failed — missing credentials",
    });
    return bootstrapUnauthorized();
  }

  if (!isBootstrapAdminEmail(emailRaw)) {
    await emitBootstrapOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.BOOTSTRAP_LOGIN_FAILED,
      severity: OperationalActivitySeverity.warning,
      message: "Bootstrap login failed — email mismatch",
    });
    return bootstrapUnauthorized();
  }

  const emailNorm = normalizedBootstrapAdminEmail()!;
  if (!bootstrapLoginRateAllowed(request, emailNorm)) {
    return bootstrapRateLimited();
  }

  const expectedPass = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim() ?? "";
  if (!timingSafeEqualUtf8(password, expectedPass)) {
    await emitBootstrapOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.BOOTSTRAP_LOGIN_FAILED,
      severity: OperationalActivitySeverity.warning,
      message: "Bootstrap login failed — invalid password",
    });
    return bootstrapUnauthorized();
  }

  const row = await loadBootstrapAuthRow();
  const totpEnabled = bootstrapTotpIsEnabled(row);

  if (!totpEnabled) {
    const secret = createBootstrapTotpSecret();
    const plainRecovery = generateBootstrapRecoveryCodes();
    const recoveryHashes = hashBootstrapRecoveryCodes(plainRecovery);
    await upsertBootstrapPendingSecret(secret, recoveryHashes);
    const qrDataUrl = await bootstrapQrDataUrl(secret);

    const res = bootstrapJson({
      step: "totp_setup",
      qrDataUrl,
      recoveryCodes: plainRecovery,
      message:
        "Scan the QR code with your authenticator app, save the recovery codes, then enter the 6-digit code.",
    });
    return attachBootstrapPending(res, { email: emailNorm, phase: "totp_setup" });
  }

  const res = bootstrapJson({
    step: "totp_verify",
    message: "Enter the 6-digit code from your authenticator app.",
  });
  return attachBootstrapPending(res, { email: emailNorm, phase: "password_ok" });
}
