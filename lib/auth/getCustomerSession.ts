import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { readImpersonationFromCookies } from "@/lib/auth/cognito/impersonation";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { COGNITO_ID_TOKEN_COOKIE } from "@/lib/auth/cognito/sessionCookies";
import { issuerMatches, sessionUserFromIdTokenPayload } from "@/lib/auth/cognito/tokens";
import { isCustomer, isSuperAdmin } from "@/lib/auth/cognito/roles";

export type CustomerSessionPayload = {
  typ: "customer";
  sub: string;
  email: string;
  exp: number;
  /** Super-admin preview or scoped impersonation — not set for ordinary customers. */
  governance?: { preview?: boolean; impersonation?: boolean };
};

/**
 * Storefront customer session from Cognito ID token when the user is in the `customer` group,
 * or super-admin **customer-scope impersonation** (HttpOnly cookie, HMAC-verified; actor bound server-side).
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
    const user = sessionUserFromIdTokenPayload(payload);
    if (!user?.email) return null;

    if (isCustomer(user.groups)) {
      return {
        typ: "customer",
        sub: user.sub,
        email: user.email,
        exp: payload.exp,
      };
    }

    if (isSuperAdmin(user.groups)) {
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
