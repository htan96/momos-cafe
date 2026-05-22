import { createHash } from "node:crypto";

/** SHA-256 hex digest over the raw webhook body interpreted as UTF-8 (canonical string passed in). */
export function sha256HexUtf8(payload: string): string {
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
