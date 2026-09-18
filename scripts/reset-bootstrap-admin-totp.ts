/**
 * Operator script: clear bootstrap super-admin TOTP enrollment in `bootstrap_admin_auth`.
 *
 * Preserves: bootstrap email row, `users` SuperAdmin row, env credentials.
 * Does not set BOOTSTRAP_ADMIN_TOTP_REQUIRED=0 — MFA remains required on next login.
 *
 * Usage (from repo root, loads .env for DATABASE_URL):
 *   set -a && . ./.env && set +a && npx tsx scripts/reset-bootstrap-admin-totp.ts --confirm
 */
import { OperationalActivitySeverity, Prisma } from "@prisma/client";

import { normalizedBootstrapAdminEmail } from "../lib/bootstrap/config";
import { emitBootstrapOperationalEvent } from "../lib/bootstrap/events";
import { OPERATIONAL_EVENT_TYPES } from "../lib/operations/operationalEventTypes";
import { prisma } from "../lib/prisma";

const ROW_ID = "default";

type BeforeSnapshot = {
  totpEnabled: boolean;
  hadSecret: boolean;
  hadVerifiedAt: boolean;
  hadRecoveryHashes: boolean;
};

async function main() {
  const args = process.argv.slice(2);
  if (!args.includes("--confirm")) {
    console.error(
      "[reset-bootstrap-totp] Refusing to run without --confirm. This clears TOTP enrollment for the bootstrap admin."
    );
    console.error(
      "  set -a && . ./.env && set +a && npx tsx scripts/reset-bootstrap-admin-totp.ts --confirm"
    );
    process.exit(1);
  }

  if (process.env.BOOTSTRAP_ADMIN_TOTP_REQUIRED === "0") {
    console.error(
      "[reset-bootstrap-totp] BOOTSTRAP_ADMIN_TOTP_REQUIRED=0 — bootstrap MFA is disabled in env; aborting."
    );
    process.exit(1);
  }

  const email = normalizedBootstrapAdminEmail();
  if (!email) {
    console.error("[reset-bootstrap-totp] BOOTSTRAP_ADMIN_EMAIL is not configured.");
    process.exit(1);
  }

  const before = await prisma.bootstrapAdminAuth.findFirst({
    where: { id: ROW_ID, emailNormalized: email },
    select: {
      totpEnabled: true,
      totpSecretEncrypted: true,
      totpVerifiedAt: true,
      recoveryCodesHashes: true,
    },
  });

  if (!before) {
    console.error(
      `[reset-bootstrap-totp] No bootstrap_admin_auth row for id=${ROW_ID} email=${email}.`
    );
    process.exit(1);
  }

  const snapshot: BeforeSnapshot = {
    totpEnabled: before.totpEnabled,
    hadSecret: Boolean(before.totpSecretEncrypted?.length),
    hadVerifiedAt: before.totpVerifiedAt != null,
    hadRecoveryHashes: Array.isArray(before.recoveryCodesHashes)
      ? before.recoveryCodesHashes.length > 0
      : before.recoveryCodesHashes != null,
  };

  const result = await prisma.bootstrapAdminAuth.updateMany({
    where: { id: ROW_ID, emailNormalized: email },
    data: {
      totpEnabled: false,
      totpSecretEncrypted: null,
      totpVerifiedAt: null,
      recoveryCodesHashes: Prisma.JsonNull,
    },
  });

  if (result.count !== 1) {
    console.error(
      `[reset-bootstrap-totp] Expected to update 1 row, updated ${result.count}.`
    );
    process.exit(1);
  }

  const after = await prisma.bootstrapAdminAuth.findFirst({
    where: { id: ROW_ID, emailNormalized: email },
    select: {
      totpEnabled: true,
      totpSecretEncrypted: true,
      totpVerifiedAt: true,
      recoveryCodesHashes: true,
    },
  });

  console.info("[reset-bootstrap-totp] Cleared bootstrap TOTP enrollment:", {
    rowId: ROW_ID,
    emailNormalized: email,
    before: snapshot,
    after: {
      totpEnabled: after?.totpEnabled ?? null,
      secretCleared: !after?.totpSecretEncrypted?.length,
      totpVerifiedAt: after?.totpVerifiedAt ?? null,
      recoveryCodesCleared: after?.recoveryCodesHashes == null,
    },
  });

  await emitBootstrapOperationalEvent({
    type: OPERATIONAL_EVENT_TYPES.BOOTSTRAP_TOTP_RESET,
    severity: OperationalActivitySeverity.warning,
    message: "Bootstrap super-admin TOTP enrollment cleared (operator reset)",
    metadata: {
      rowId: ROW_ID,
      emailNormalized: email,
      priorTotpEnabled: snapshot.totpEnabled,
      priorHadSecret: snapshot.hadSecret,
      priorHadVerifiedAt: snapshot.hadVerifiedAt,
      priorHadRecoveryHashes: snapshot.hadRecoveryHashes,
    },
  });

  console.info(
    "[reset-bootstrap-totp] Emitted operational event bootstrap.totp_reset. Next login: step totp_setup."
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("[reset-bootstrap-totp]", e);
  process.exit(1);
});
