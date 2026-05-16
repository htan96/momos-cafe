import { cookies } from "next/headers";
import { IMPERSONATION_COOKIE } from "@/lib/governance/impersonationConstants";
import { verifyImpersonationToken } from "@/lib/governance/impersonationToken";
import type { ImpersonationPayload } from "@/lib/governance/impersonationToken";
import { getImpersonationSecretForVerification } from "@/lib/governance/impersonationSecret";
import { prisma } from "@/lib/prisma";

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

  const payload = await verifyImpersonationToken(raw, secret);
  if (!payload) return null;

  try {
    const row = await prisma.impersonationSupportSession.findFirst({
      where: {
        id: payload.ledgerId,
        endedAt: null,
        actorSub: payload.actorSub,
        targetEmail: payload.targetEmail.trim().toLowerCase(),
        scope: payload.scope,
        sessionPublicId: payload.sessionPublicId,
      },
    });
    if (!row) return null;
  } catch (e) {
    console.error("[impersonation] ledger lookup failed", e);
    return null;
  }

  return payload;
}
