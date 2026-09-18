import { createHash, randomBytes } from "node:crypto";

const CODE_COUNT = 8;
const CODE_SEGMENT_LEN = 4;

export function generateBootstrapRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < CODE_COUNT; i++) {
    const a = randomBytes(2).toString("hex").toUpperCase();
    const b = randomBytes(2).toString("hex").toUpperCase();
    codes.push(`${a}-${b}`);
  }
  return codes;
}

export function hashBootstrapRecoveryCode(plain: string): string {
  const norm = plain.replace(/\s/g, "").toUpperCase();
  return createHash("sha256").update(norm, "utf8").digest("hex");
}

export function hashBootstrapRecoveryCodes(plainCodes: string[]): string[] {
  return plainCodes.map(hashBootstrapRecoveryCode);
}

export function recoveryCodeLooksValid(candidate: string): boolean {
  const norm = candidate.replace(/\s/g, "").toUpperCase();
  return /^[A-F0-9]{4}-[A-F0-9]{4}$/.test(norm);
}
