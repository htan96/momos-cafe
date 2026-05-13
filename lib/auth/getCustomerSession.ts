import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { COGNITO_ID_TOKEN_COOKIE } from "@/lib/auth/cognito/sessionCookies";
import { issuerMatches, sessionUserFromIdTokenPayload } from "@/lib/auth/cognito/tokens";
import { isCustomer } from "@/lib/auth/cognito/roles";
import { CUSTOMER_SESSION_COOKIE, verifyCustomerSessionToken } from "@/lib/auth/customerSessionCrypto";
import type { CustomerSessionPayload } from "@/lib/auth/customerSessionCrypto";

/**
 * Storefront customer session: legacy magic-link cookie **or** Cognito ID token when the user is in the `customer` group.
 * Order history remains keyed by `sub` from the active session (linking Cognito users to commerce rows is a separate concern).
 */
export async function getCustomerSession(): Promise<CustomerSessionPayload | null> {
  const jar = await cookies();
  const legacy = await verifyCustomerSessionToken(jar.get(CUSTOMER_SESSION_COOKIE)?.value);
  if (legacy) return legacy;

  const cfg = getCognitoConfig();
  if (!cfg) return null;

  const id = jar.get(COGNITO_ID_TOKEN_COOKIE)?.value;
  if (!id) return null;

  try {
    const payload = decodeJwt(id);
    if (!issuerMatches(cfg, payload.iss)) return null;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp < now - 30) return null;
    const user = sessionUserFromIdTokenPayload(payload);
    if (!user?.email || !isCustomer(user.groups)) return null;
    return {
      typ: "customer",
      sub: user.sub,
      email: user.email,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
