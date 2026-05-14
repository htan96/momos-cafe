export type MobileNavSurfaceKind = "storefront" | "customer" | "admin" | "super_admin" | "portal";

export function getMobileNavSurfaceKind(pathname: string): MobileNavSurfaceKind {
  if (pathname === "/account" || pathname.startsWith("/account/")) return "customer";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/super-admin" || pathname.startsWith("/super-admin/")) return "super_admin";
  if (pathname === "/portal" || pathname.startsWith("/portal/")) return "portal";
  return "storefront";
}
