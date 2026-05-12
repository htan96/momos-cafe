import { cookies } from "next/headers";
import { CUSTOMER_SESSION_COOKIE, verifyCustomerSessionToken } from "@/lib/auth/customerSessionCrypto";
import type { CustomerSessionPayload } from "@/lib/auth/customerSessionCrypto";

export async function getCustomerSession(): Promise<CustomerSessionPayload | null> {
  const jar = await cookies();
  return verifyCustomerSessionToken(jar.get(CUSTOMER_SESSION_COOKIE)?.value);
}
