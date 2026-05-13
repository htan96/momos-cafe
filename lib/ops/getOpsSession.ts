import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { COGNITO_ID_TOKEN_COOKIE } from "@/lib/auth/cognito/sessionCookies";
import { isAdmin, isSuperAdmin } from "@/lib/auth/cognito/roles";
import { issuerMatches, sessionUserFromIdTokenPayload } from "@/lib/auth/cognito/tokens";
import type { OpsSessionPayload } from "@/lib/ops/types";

/** Ops console + `/api/ops/*` — Cognito ID token with `admin` or `super_admin` group only. */
export async function getOpsSession(): Promise<OpsSessionPayload | null> {
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
    if (!user?.email || !isAdmin(user.groups)) return null;

    return {
      email: user.email,
      role: "admin",
      exp: payload.exp,
      roleBadge: isSuperAdmin(user.groups) ? "super_admin" : "admin",
    };
  } catch {
    return null;
  }
}
