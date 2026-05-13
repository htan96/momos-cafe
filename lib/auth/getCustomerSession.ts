import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { COGNITO_ID_TOKEN_COOKIE } from "@/lib/auth/cognito/sessionCookies";
import { issuerMatches, sessionUserFromIdTokenPayload } from "@/lib/auth/cognito/tokens";
import { isCustomer } from "@/lib/auth/cognito/roles";

export type CustomerSessionPayload = {
  typ: "customer";
  sub: string;
  email: string;
  exp: number;
};

/**
 * Storefront customer session from Cognito ID token when the user is in the `customer` group.
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
