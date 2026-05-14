import { cookies } from "next/headers";
import {
  IMPERSONATION_COOKIE,
} from "@/lib/governance/impersonationConstants";
import { verifyImpersonationToken } from "@/lib/governance/impersonationToken";
import type { ImpersonationPayload } from "@/lib/governance/impersonationToken";
import { getImpersonationSecretForVerification } from "@/lib/governance/impersonationSecret";

export type { ImpersonationPayload };

/**
 * Verified impersonation from HttpOnly cookie (server components / route handlers).
 * Requires valid HMAC; actor identity is still checked against the live Cognito session elsewhere.
 */
export async function readImpersonationFromCookies(): Promise<ImpersonationPayload | null> {
  const secret = getImpersonationSecretForVerification();
  if (!secret) return null;

  const jar = await cookies();
  const raw = jar.get(IMPERSONATION_COOKIE)?.value;
  if (!raw) return null;

  return verifyImpersonationToken(raw, secret);
}
