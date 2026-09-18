import { jwtVerify } from "jose";

import {
  BOOTSTRAP_SUPER_ADMIN_GROUP,
  normalizedBootstrapAdminEmail,
} from "@/lib/bootstrap/config";
import { bootstrapSessionHmacKeyMaterial } from "@/lib/bootstrap/sessionKey";

export type BootstrapAdminSession = {
  email: string;
  groups: string[];
};

/** JWT verify only — safe for Edge middleware (no Postgres). */
export async function verifyBootstrapAdminSession(
  compact: string | null | undefined
): Promise<BootstrapAdminSession | null> {
  if (!compact?.length) return null;
  const guard = normalizedBootstrapAdminEmail();
  if (!guard) return null;

  try {
    const key = bootstrapSessionHmacKeyMaterial();
    const { payload } = await jwtVerify(compact, key);
    if (payload.typ !== "bootstrap_admin") return null;
    const email =
      typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (email !== guard) return null;
    const groups = Array.isArray(payload.groups)
      ? payload.groups.filter((g): g is string => typeof g === "string")
      : [BOOTSTRAP_SUPER_ADMIN_GROUP];
    return { email, groups };
  } catch {
    return null;
  }
}
