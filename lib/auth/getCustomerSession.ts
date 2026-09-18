import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { readImpersonationFromCookies } from "@/lib/auth/cognito/impersonation";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { COGNITO_ID_TOKEN_COOKIE } from "@/lib/auth/cognito/sessionCookies";
import { issuerMatches, sessionUserFromIdTokenPayload } from "@/lib/auth/cognito/tokens";
import { isCustomer, isSuperAdmin } from "@/lib/auth/cognito/roles";
import { enrichAuthUserFromDb } from "@/lib/auth/userAuthority";

export type CustomerSessionPayload = {
  typ: "customer";
  sub: string;
  email: string;
  exp: number;
  /** Super-admin preview or scoped impersonation — not set for ordinary customers. */
  governance?: { preview?: boolean; impersonation?: boolean };
};

/**
 * Storefront customer session from DB role Customer (or super-admin customer-scope impersonation).
 */
export async function getCustomerSession(): Promise<CustomerSessionPayload | null> {
  const cfg = getCognitoConfig();
  if (!cfg) return null;

  const jar = await cookies();
  const id = jar.get(COGNITO_ID_TOKEN_COOKIE)?.value;
  if (!id) return null;

  try {
    const payload = decodeJwt(id);
    if (!issuerMatches(cfg, payload.iss)) return null;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp < now - 30) return null;
    const base = sessionUserFromIdTokenPayload(payload);
    if (!base?.email) return null;
    const user = await enrichAuthUserFromDb(base);
    const email = user.email?.trim() || base.email.trim();
    if (!email) return null;

    if (isCustomer(user)) {
      const imp = await readImpersonationFromCookies();
      let governanceImpersonation = false;
      if (
        imp?.scope === "customer" &&
        (imp.targetSub === user.sub ||
          imp.targetEmail.trim().toLowerCase() === email.toLowerCase())
      ) {
        governanceImpersonation = true;
      }

      return {
        typ: "customer",
        sub: user.sub,
        email,
        exp: payload.exp,
        ...(governanceImpersonation ? { governance: { impersonation: true } } : {}),
      };
    }

    if (isSuperAdmin(user)) {
      const imp = await readImpersonationFromCookies();
      if (imp && imp.scope === "customer" && imp.actorSub === user.sub) {
        return {
          typ: "customer",
          sub: imp.targetSub?.trim() || imp.targetEmail.trim().toLowerCase(),
          email: imp.targetEmail.trim().toLowerCase(),
          exp: payload.exp,
          governance: { impersonation: true },
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}
