/** Paths that use {@link PlatformShell} — storefront Header/Footer must not wrap these. */
const PLATFORM_PREFIXES = ["/account", "/admin", "/super-admin", "/portal"] as const;

export function isPlatformPath(pathname: string): boolean {
  return PLATFORM_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
