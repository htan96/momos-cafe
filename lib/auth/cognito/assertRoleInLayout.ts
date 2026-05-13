import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeInternalPath } from "@/lib/auth/cognito/redirectByRole";
import {
  hasRole,
  isAdmin,
  isCustomer,
  isSuperAdmin,
} from "@/lib/auth/cognito/roles";
import type { CognitoSessionUser } from "@/lib/auth/cognito/types";
import { getCustomerSession } from "@/lib/auth/getCustomerSession";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";

const PATH_HEADER = "x-momos-pathname";

function forwardedLoginHref(fallbackInternalPath: string): Promise<string> {
  return headers().then((h) => {
    const forwarded = h.get(PATH_HEADER)?.trim();
    const next = safeInternalPath(forwarded, fallbackInternalPath);
    return `/login?next=${encodeURIComponent(next)}`;
  });
}

/** Mirrors middleware: `/account` is customer-only. */
export async function assertCustomerPlatformLayout(): Promise<{ email: string; sub: string }> {
  const session = await getCustomerSession();
  if (session) {
    return session;
  }
  redirect(await forwardedLoginHref("/account"));
}

/** Mirrors middleware: `/admin` allows admin / super_admin; customers → `/account`. */
export async function assertAdminPlatformLayout(): Promise<CognitoSessionUser> {
  const user = await getCognitoServerSession();
  if (!user) {
    redirect(await forwardedLoginHref("/admin"));
  }
  const { groups } = user;
  if (isAdmin(groups)) {
    return user;
  }
  if (isCustomer(groups)) {
    redirect("/account");
  }
  redirect(await forwardedLoginHref("/admin"));
}

/** Mirrors middleware: `/super-admin` allows super_admin only; admin→`/admin`, customer→`/account`. */
export async function assertSuperAdminPlatformLayout(): Promise<CognitoSessionUser> {
  const user = await getCognitoServerSession();
  if (!user) {
    redirect(await forwardedLoginHref("/super-admin"));
  }
  const { groups } = user;
  if (isSuperAdmin(groups)) {
    return user;
  }
  if (hasRole(groups, "admin")) {
    redirect("/admin");
  }
  if (isCustomer(groups)) {
    redirect("/account");
  }
  redirect(await forwardedLoginHref("/super-admin"));
}

/** Optional Cognito-enveloped zones (e.g. `/portal`) — any authenticated Cognito session. */
export async function assertAuthedPlatformLayout(): Promise<CognitoSessionUser> {
  const user = await getCognitoServerSession();
  if (!user) {
    redirect(await forwardedLoginHref("/portal"));
  }
  return user;
}
