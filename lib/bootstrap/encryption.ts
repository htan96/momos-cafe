import { createHash, createSecretKey } from "node:crypto";

import { EncryptJWT, jwtDecrypt } from "jose";

function encryptionKeyMaterial(): string {
  const raw =
    process.env.APP_ENCRYPTION_KEY?.trim() ||
    process.env.TOTP_ENCRYPTION_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    process.env.INTERNAL_API_SECRET?.trim();
  if (!raw?.length) {
    throw new Error(
      "APP_ENCRYPTION_KEY, TOTP_ENCRYPTION_SECRET, SESSION_SECRET, or INTERNAL_API_SECRET required for bootstrap TOTP encryption"
    );
  }
  return raw;
}

function aes256Key() {
  const digest = createHash("sha256").update(encryptionKeyMaterial(), "utf8").digest();
  return createSecretKey(digest);
}

/** JWE compact for TOTP secret at rest. */
export async function encryptTotpSecret(plainSecret: string): Promise<string> {
  const key = aes256Key();
  return await new EncryptJWT({ s: plainSecret })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .encrypt(key);
}

export async function decryptTotpSecret(compact: string): Promise<string> {
  const key = aes256Key();
  const { payload } = await jwtDecrypt(compact, key);
  const s = typeof payload.s === "string" ? payload.s : null;
  if (!s?.length) throw new Error("invalid_encrypted_totp");
  return s;
}
