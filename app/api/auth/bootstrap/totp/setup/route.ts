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
import {
  enableBootstrapTotpAfterVerify,
  loadBootstrapAuthRow,
  readBootstrapPlainTotpSecret,
} from "@/lib/bootstrap/store";
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
  if (!pending || pending.phase !== "totp_setup") {
    await emitBootstrapOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.BOOTSTRAP_TOTP_FAILED,
      severity: OperationalActivitySeverity.warning,
      message: "Bootstrap TOTP setup failed — invalid pending session",
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
      message: "Bootstrap TOTP setup failed — invalid code",
    });
    return bootstrapJson({ error: "invalid_totp" }, 401);
  }

  const row = await loadBootstrapAuthRow();
  await enableBootstrapTotpAfterVerify(row?.recoveryCodesHashes ?? null);
  const record = await ensureBootstrapSuperAdminUser();

  await emitBootstrapOperationalEvent({
    type: OPERATIONAL_EVENT_TYPES.BOOTSTRAP_TOTP_ENROLLED,
    message: "Bootstrap super-admin TOTP enrolled",
  });
  if (record.created) {
    await emitBootstrapOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.BOOTSTRAP_SUPER_ADMIN_CREATED,
      message: "Bootstrap super-admin user record created/repaired in Postgres",
      metadata: { cognitoSub: record.cognitoSub },
    });
  }

  const res = bootstrapJson({
    ok: true,
    redirect: "/super-admin",
  });
  const sessionRes = await attachBootstrapSession(res, emailNorm);

  await emitBootstrapOperationalEvent({
    type: OPERATIONAL_EVENT_TYPES.BOOTSTRAP_LOGIN_SUCCESS,
    message: "Bootstrap super-admin signed in (TOTP enrolled)",
  });

  return sessionRes;
}
