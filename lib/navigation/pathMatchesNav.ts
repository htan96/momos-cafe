/** Exact match only for dashboard roots — subpages highlight their own link only. */
export function pathMatchesNav(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/account" || href === "/admin" || href === "/super-admin") {
    return false;
  }
  return pathname.startsWith(`${href}/`);
}
