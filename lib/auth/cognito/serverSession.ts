import { cookies } from "next/headers";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { COGNITO_ID_TOKEN_COOKIE } from "@/lib/auth/cognito/sessionCookies";
import {
  decodeCognitoIdTokenUnsafe,
  issuerMatches,
} from "@/lib/auth/cognito/tokens";
import { decodeJwt } from "jose";

export async function getCognitoServerSession() {
  const cfg = getCognitoConfig();
  if (!cfg) return null;

  const jar = await cookies();
  const id = jar.get(COGNITO_ID_TOKEN_COOKIE)?.value;
  if (!id) return null;

  try {
    const payload = decodeJwt(id);
    if (!issuerMatches(cfg, payload.iss)) return null;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < now - 30) return null;
  } catch {
    return null;
  }

  return decodeCognitoIdTokenUnsafe(id);
}
