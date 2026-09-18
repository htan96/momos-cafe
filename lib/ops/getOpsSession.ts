import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { COGNITO_ID_TOKEN_COOKIE } from "@/lib/auth/cognito/sessionCookies";
import { isAdmin, isSuperAdmin } from "@/lib/auth/cognito/roles";
import { issuerMatches, sessionUserFromIdTokenPayload } from "@/lib/auth/cognito/tokens";
import {
  bootstrapSessionToCognitoUser,
  getBootstrapAdminSessionForServer,
} from "@/lib/bootstrap/guards";
import { enrichAuthUserFromDb } from "@/lib/auth/userAuthority";
import type { OpsSessionPayload } from "@/lib/ops/types";

/**
 * Ops console + `/api/ops/*` — Cognito JWT or bootstrap session with DB role Admin or SuperAdmin (Active only).
 */
export async function getOpsSession(): Promise<OpsSessionPayload | null> {
  const bootstrap = await getBootstrapAdminSessionForServer();
  if (bootstrap) {
    const user = bootstrapSessionToCognitoUser(bootstrap);
    const exp = Math.floor(Date.now() / 1000) + 8 * 60 * 60;
    return {
      email: bootstrap.email,
      sub: user.sub,
      role: "admin",
      exp,
      roleBadge: "super_admin",
      dbRole: user.role,
      status: user.status,
    };
  }

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
    if (!isAdmin(user)) return null;
    const email = user.email?.trim() || base.email.trim();
    if (!email) return null;

    return {
      email,
      sub: user.sub,
      role: "admin",
      exp: payload.exp,
      roleBadge: isSuperAdmin(user) ? "super_admin" : "admin",
      dbRole: user.role,
      status: user.status,
    };
  } catch {
    return null;
  }
}
