import { decryptTotpSecret, encryptTotpSecret } from "@/lib/bootstrap/encryption";
import { normalizedBootstrapAdminEmail } from "@/lib/bootstrap/config";
import { prisma } from "@/lib/prisma";

export type BootstrapAuthRow = {
  totpEnabled: boolean;
  totpSecretEncrypted: string | null;
  totpVerifiedAt: Date | null;
  recoveryCodesHashes: string[] | null;
};

const ROW_ID = "default";

function parseRecoveryHashes(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out = raw.filter((h): h is string => typeof h === "string" && h.length > 0);
  return out.length ? out : null;
}

export async function loadBootstrapAuthRow(): Promise<BootstrapAuthRow | null> {
  const email = normalizedBootstrapAdminEmail();
  if (!email) return null;

  try {
    const row = await prisma.bootstrapAdminAuth.findFirst({
      where: { id: ROW_ID, emailNormalized: email },
      select: {
        totpEnabled: true,
        totpSecretEncrypted: true,
        totpVerifiedAt: true,
        recoveryCodesHashes: true,
      },
    });
    if (!row) return null;
    return {
      totpEnabled: row.totpEnabled,
      totpSecretEncrypted: row.totpSecretEncrypted,
      totpVerifiedAt: row.totpVerifiedAt,
      recoveryCodesHashes: parseRecoveryHashes(row.recoveryCodesHashes),
    };
  } catch {
    return null;
  }
}

export async function upsertBootstrapPendingSecret(
  plainSecret: string,
  recoveryHashes: string[] | null
): Promise<void> {
  const email = normalizedBootstrapAdminEmail();
  if (!email) throw new Error("bootstrap_email_unconfigured");

  const enc = await encryptTotpSecret(plainSecret);
  await prisma.bootstrapAdminAuth.upsert({
    where: { id: ROW_ID },
    create: {
      id: ROW_ID,
      emailNormalized: email,
      totpSecretEncrypted: enc,
      totpEnabled: false,
      recoveryCodesHashes: recoveryHashes ?? undefined,
    },
    update: {
      emailNormalized: email,
      totpSecretEncrypted: enc,
      totpEnabled: false,
      ...(recoveryHashes ? { recoveryCodesHashes: recoveryHashes } : {}),
    },
  });
}

export async function enableBootstrapTotpAfterVerify(
  recoveryHashes: string[] | null
): Promise<void> {
  const email = normalizedBootstrapAdminEmail();
  if (!email) throw new Error("bootstrap_email_unconfigured");

  await prisma.bootstrapAdminAuth.updateMany({
    where: { id: ROW_ID, emailNormalized: email },
    data: {
      totpEnabled: true,
      totpVerifiedAt: new Date(),
      ...(recoveryHashes ? { recoveryCodesHashes: recoveryHashes } : {}),
    },
  });
}

export async function readBootstrapPlainTotpSecret(): Promise<string | null> {
  const row = await loadBootstrapAuthRow();
  if (!row?.totpSecretEncrypted?.length) return null;
  try {
    return await decryptTotpSecret(row.totpSecretEncrypted);
  } catch {
    return null;
  }
}

export function bootstrapTotpIsEnabled(row: BootstrapAuthRow | null): boolean {
  return Boolean(row?.totpEnabled && row.totpSecretEncrypted?.length);
}

export async function consumeBootstrapRecoveryCodeHash(
  codeHash: string
): Promise<boolean> {
  const email = normalizedBootstrapAdminEmail();
  if (!email) return false;

  const row = await loadBootstrapAuthRow();
  const hashes = row?.recoveryCodesHashes;
  if (!hashes?.length) return false;

  const idx = hashes.indexOf(codeHash);
  if (idx < 0) return false;

  const next = hashes.filter((_, i) => i !== idx);
  await prisma.bootstrapAdminAuth.updateMany({
    where: { id: ROW_ID, emailNormalized: email },
    data: { recoveryCodesHashes: next.length ? next : [] },
  });
  return true;
}
