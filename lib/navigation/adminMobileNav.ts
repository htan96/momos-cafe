import { ADMIN_PLATFORM_NAV } from "@/components/platform/navConfig";
import type { StorefrontNavIconId } from "@/lib/navigation/storefrontMobileNav";

export const ADMIN_MOBILE_PRIMARY_HREFS = ["/admin", "/admin/queues", "/admin/shipping", "/admin/support"] as const;

export type AdminMobileTab =
  | {
      id: string;
      type: "link";
      href: string;
      label: string;
      icon: StorefrontNavIconId | "queues" | "shipping" | "support" | "more";
    }
  | {
      id: "more";
      type: "more";
      label: string;
      icon: "more";
    };

export const ADMIN_MOBILE_PRIMARY_TABS: AdminMobileTab[] = [
  { id: "ops", type: "link", href: "/admin", label: "Ops", icon: "home" },
  { id: "queues", type: "link", href: "/admin/queues", label: "Queues", icon: "queues" },
  { id: "shipping", type: "link", href: "/admin/shipping", label: "Ship", icon: "shipping" },
  { id: "support", type: "link", href: "/admin/support", label: "Support", icon: "support" },
  { id: "more", type: "more", label: "More", icon: "more" },
];

export function getAdminMobileMoreLinks(): { href: string; label: string }[] {
  const primary = new Set<string>(ADMIN_MOBILE_PRIMARY_HREFS);
  return ADMIN_PLATFORM_NAV.filter((item) => !primary.has(item.href)).map((item) => ({
    href: item.href,
    label: item.label,
  }));
}
