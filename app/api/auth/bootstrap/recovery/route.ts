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
import { bootstrapRecoveryRateAllowed } from "@/lib/bootstrap/rateLimit";
import {
  hashBootstrapRecoveryCode,
  recoveryCodeLooksValid,
} from "@/lib/bootstrap/recoveryCodes";
import { consumeBootstrapRecoveryCodeHash } from "@/lib/bootstrap/store";
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
  if (!bootstrapRecoveryRateAllowed(request, emailNorm)) {
    return bootstrapRateLimited();
  }

  const ck = await cookies();
  const pending = await unsealBootstrapPending(
    ck.get(MOMOS_BOOTSTRAP_PENDING_COOKIE)?.value
  );
  if (!pending || pending.phase !== "password_ok") {
    return bootstrapUnauthorized();
  }

  let body: { recoveryCode?: unknown };
  try {
    body = await request.json();
  } catch {
    return bootstrapUnauthorized();
  }

  const recoveryCode = typeof body.recoveryCode === "string" ? body.recoveryCode : "";
  if (!recoveryCodeLooksValid(recoveryCode)) {
    return bootstrapJson({ error: "invalid_recovery_code" }, 401);
  }

  const hash = hashBootstrapRecoveryCode(recoveryCode);
  const consumed = await consumeBootstrapRecoveryCodeHash(hash);
  if (!consumed) {
    await emitBootstrapOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.BOOTSTRAP_LOGIN_FAILED,
      severity: OperationalActivitySeverity.warning,
      message: "Bootstrap recovery code rejected",
    });
    return bootstrapJson({ error: "invalid_recovery_code" }, 401);
  }

  await ensureBootstrapSuperAdminUser();

  await emitBootstrapOperationalEvent({
    type: OPERATIONAL_EVENT_TYPES.BOOTSTRAP_RECOVERY_CODE_USED,
    message: "Bootstrap super-admin signed in via recovery code",
  });

  const res = bootstrapJson({ ok: true, redirect: "/super-admin" });
  return attachBootstrapSession(res, emailNorm);
}
