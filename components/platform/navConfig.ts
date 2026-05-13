import type { PlatformNavItem } from "@/components/platform/PlatformShell";

export const ACCOUNT_PLATFORM_NAV: PlatformNavItem[] = [
  { href: "/account", label: "Dashboard" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/rewards", label: "Rewards" },
  { href: "/account/catering-requests", label: "Catering" },
  { href: "/account/settings", label: "Profile" },
];

export const ADMIN_PLATFORM_NAV: PlatformNavItem[] = [
  { href: "/admin", label: "Operations" },
  { href: "/admin/catering-orders", label: "Catering" },
  { href: "/admin/customer-lookup", label: "Customers" },
  { href: "/admin/order-lookup", label: "Orders" },
];

export const SUPER_ADMIN_PLATFORM_NAV: PlatformNavItem[] = [
  { href: "/super-admin", label: "Dashboard" },
  { href: "/super-admin/roles", label: "Roles" },
  { href: "/super-admin/admins", label: "Admins" },
  { href: "/super-admin/customer-lookup", label: "Customers" },
  { href: "/super-admin/cognito-tools", label: "Cognito" },
  { href: "/super-admin/audit", label: "Systems" },
];

export const PORTAL_PLATFORM_NAV: PlatformNavItem[] = [{ href: "/portal", label: "Home" }];
