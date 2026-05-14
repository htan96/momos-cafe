/**
 * Paths that use {@link PlatformShell}.
 *
 * `isPlatformPath` skips storefront-only **Footer**. Cart (drawer + nav) and mobile **BottomNav**
 * still mount so commerce stays reachable while signed in on account/admin/super-admin/portal.
 * The global storefront **Header** still renders above these routes.
 */
const PLATFORM_PREFIXES = ["/account", "/admin", "/super-admin", "/portal"] as const;

export function isPlatformPath(pathname: string): boolean {
  return PLATFORM_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
