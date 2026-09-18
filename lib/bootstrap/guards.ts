import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import type { AuthUser } from "@/lib/auth/AuthProvider";
import {
  bootstrapCognitoSubForEmail,
  MOMOS_BOOTSTRAP_SESSION_COOKIE,
} from "@/lib/bootstrap/config";
import { getBootstrapAdminSessionEdge } from "@/lib/bootstrap/guardsEdge";
import { ensureBootstrapSuperAdminUser } from "@/lib/bootstrap/profile";

export { getBootstrapAdminSessionEdge } from "@/lib/bootstrap/guardsEdge";

export type BootstrapAdminServerSession = {
  email: string;
  groups: string[];
  isBootstrapAdmin: true;
  effectiveRole: "super_admin";
  cognitoSub: string;
};

export async function getBootstrapAdminSessionFromCookieValue(
  cookieValue: string | null | undefined
): Promise<BootstrapAdminServerSession | null> {
  const session = await getBootstrapAdminSessionEdge(cookieValue);
  if (!session) return null;

  let cognitoSub = bootstrapCognitoSubForEmail(session.email);
  try {
    const record = await ensureBootstrapSuperAdminUser();
    cognitoSub = record.cognitoSub;
  } catch {
    /* JWT still valid — use synthetic sub */
  }

  return {
    ...session,
    isBootstrapAdmin: true,
    effectiveRole: "super_admin",
    cognitoSub,
  };
}

export async function getBootstrapAdminSessionForServer(): Promise<BootstrapAdminServerSession | null> {
  const ck = await cookies();
  return getBootstrapAdminSessionFromCookieValue(
    ck.get(MOMOS_BOOTSTRAP_SESSION_COOKIE)?.value
  );
}

export async function getBootstrapAdminSessionFromRequest(
  request: NextRequest
): Promise<BootstrapAdminServerSession | null> {
  return getBootstrapAdminSessionFromCookieValue(
    request.cookies.get(MOMOS_BOOTSTRAP_SESSION_COOKIE)?.value
  );
}

export function bootstrapSessionToCognitoUser(
  session: BootstrapAdminServerSession
): AuthUser {
  return {
    sub: session.cognitoSub,
    username: session.email,
    email: session.email,
    groups: [...session.groups],
    role: "SuperAdmin",
    status: "Active",
    customerId: null,
    isBootstrapAdmin: true,
  };
}
