import { bootstrapAdminAuthEnabled, BOOTSTRAP_SUPER_ADMIN_GROUP } from "@/lib/bootstrap/config";
import { verifyBootstrapAdminSession } from "@/lib/bootstrap/sessionVerify";

/** JWT verify only — Edge middleware (no Postgres). */
export async function getBootstrapAdminSessionEdge(
  cookieValue: string | null | undefined
): Promise<{ email: string; groups: string[] } | null> {
  if (!bootstrapAdminAuthEnabled()) return null;
  const session = await verifyBootstrapAdminSession(cookieValue);
  if (!session) return null;
  if (!session.groups.includes(BOOTSTRAP_SUPER_ADMIN_GROUP)) return null;
  return session;
}
