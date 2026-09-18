import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeInternalPath } from "@/lib/auth/cognito/redirectByRole";
import {
  hasRole,
  isAdmin,
  isCustomer,
  isSuperAdmin,
} from "@/lib/auth/cognito/roles";
import {
  delegatedStaffAuthorityUser,
  governanceLayoutPrincipalUser,
} from "@/lib/auth/cognito/staffDelegatedAuthority";
import type { CognitoSessionUser } from "@/lib/auth/cognito/types";
import { getCustomerSession } from "@/lib/auth/getCustomerSession";
import type { CustomerSessionPayload } from "@/lib/auth/getCustomerSession";
import { readImpersonationFromCookies } from "@/lib/auth/cognito/impersonation";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";

const PATH_HEADER = "x-momos-pathname";

function forwardedLoginHref(fallbackInternalPath: string): Promise<string> {
  return headers().then((h) => {
    const forwarded = h.get(PATH_HEADER)?.trim();
    const next = safeInternalPath(forwarded, fallbackInternalPath);
    return `/login?next=${encodeURIComponent(next)}`;
  });
}

/** Mirrors middleware: `/account` is customer territory; `super_admin` may enter read-only preview (empty commerce rows). */
export async function assertCustomerPlatformLayout(): Promise<CustomerSessionPayload> {
  const session = await getCustomerSession();
  if (session) {
    return session;
  }

  const operator = await getCognitoServerSession();
  if (operator && isSuperAdmin(operator)) {
    return {
      typ: "customer",
      sub: "governance-preview",
      email: operator.email ?? operator.username ?? "",
      exp: Math.floor(Date.now() / 1000) + 3600,
      governance: { preview: true },
    };
  }

  redirect(await forwardedLoginHref("/account"));
}

export type AdminPlatformLayoutResult = {
  user: CognitoSessionUser;
  /** Native or delegated **`super_admin`** authority — mounts operational lens chrome on `/admin`. */
  showSuperAdminOperationalLens: boolean;
};

/** Mirrors middleware: `/admin` allows admin / super_admin (including delegated impersonation authority). */
export async function assertAdminPlatformLayout(): Promise<AdminPlatformLayoutResult> {
  const user = await getCognitoServerSession();
  if (!user) {
    redirect(await forwardedLoginHref("/admin"));
  }
  const impersonation = await readImpersonationFromCookies();
  const authority = delegatedStaffAuthorityUser(user, impersonation) ?? user;
  if (!isAdmin(authority)) {
    if (isCustomer(user)) {
      redirect("/account");
    }
    redirect(await forwardedLoginHref("/admin"));
  }
  return {
    user: governanceLayoutPrincipalUser(user, impersonation),
    showSuperAdminOperationalLens: isSuperAdmin(authority),
  };
}

/** Mirrors middleware: `/super-admin` uses delegated authority, not storefront subject JWT alone. */
export async function assertSuperAdminPlatformLayout(): Promise<CognitoSessionUser> {
  const user = await getCognitoServerSession();
  if (!user) {
    redirect(await forwardedLoginHref("/super-admin"));
  }
  const impersonation = await readImpersonationFromCookies();
  const authority = delegatedStaffAuthorityUser(user, impersonation) ?? user;
  if (!isSuperAdmin(authority)) {
    if (hasRole(user, "admin")) {
      redirect("/admin");
    }
    if (isCustomer(user)) {
      redirect("/account");
    }
    redirect(await forwardedLoginHref("/super-admin"));
  }
  return governanceLayoutPrincipalUser(user, impersonation);
}

/** Optional Cognito-enveloped zones (e.g. `/portal`) — any authenticated Cognito session with Active status. */
export async function assertAuthedPlatformLayout(): Promise<CognitoSessionUser> {
  const user = await getCognitoServerSession();
  if (!user) {
    redirect(await forwardedLoginHref("/portal"));
  }
  return user;
}
