import { cookies } from "next/headers";
import { OPS_SESSION_COOKIE, verifyOpsSessionToken } from "@/lib/ops/sessionCrypto";
import type { OpsSessionPayload } from "@/lib/ops/types";

export async function getOpsSession(): Promise<OpsSessionPayload | null> {
  const jar = await cookies();
  return verifyOpsSessionToken(jar.get(OPS_SESSION_COOKIE)?.value);
}
