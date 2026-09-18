import { timingSafeEqual } from "node:crypto";

/** Constant-time UTF-8 byte compare (length mismatch → false, no throw). */
export function timingSafeEqualUtf8(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
