import { SUPER_ADMIN_PLATFORM_NAV } from "@/components/platform/navConfig";
import type { StorefrontNavIconId } from "@/lib/navigation/storefrontMobileNav";

export const SUPER_ADMIN_MOBILE_PRIMARY_HREFS = [
  "/super-admin",
  "/super-admin/audit",
  "/super-admin/settings/security",
  "/super-admin/settings/health",
] as const;

export type SuperAdminMobileTab =
  | {
      id: string;
      type: "link";
      href: string;
      label: string;
      icon: StorefrontNavIconId | "governance" | "security" | "health" | "orders" | "more";
    }
  | {
      id: "more";
      type: "more";
      label: string;
      icon: "more";
    };

export const SUPER_ADMIN_MOBILE_PRIMARY_TABS: SuperAdminMobileTab[] = [
  { id: "gov", type: "link", href: "/super-admin", label: "Gov", icon: "governance" },
  { id: "audit", type: "link", href: "/super-admin/audit", label: "Audit", icon: "orders" },
  {
    id: "security",
    type: "link",
    href: "/super-admin/settings/security",
    label: "Security",
    icon: "security",
  },
  {
    id: "health",
    type: "link",
    href: "/super-admin/settings/health",
    label: "Health",
    icon: "health",
  },
  { id: "more", type: "more", label: "More", icon: "more" },
];

export function getSuperAdminMobileMoreLinks(): { href: string; label: string }[] {
  const primary = new Set<string>(SUPER_ADMIN_MOBILE_PRIMARY_HREFS);
  return SUPER_ADMIN_PLATFORM_NAV.filter((item) => !primary.has(item.href)).map((item) => ({
    href: item.href,
    label: item.label,
  }));
}
