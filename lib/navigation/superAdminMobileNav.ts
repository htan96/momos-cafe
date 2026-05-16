import { SUPER_ADMIN_PLATFORM_NAV } from "@/components/platform/navConfig";
import type { StorefrontNavIconId } from "@/lib/navigation/storefrontMobileNav";

/** Primary bottom tabs — rest of IA is under More. */
export const SUPER_ADMIN_MOBILE_PRIMARY_HREFS = ["/super-admin", "/super-admin/live-operations"] as const;

export type SuperAdminMobileTab =
  | {
      id: string;
      type: "link";
      href: string;
      label: string;
      icon:
        | StorefrontNavIconId
        | "governance"
        | "security"
        | "health"
        | "orders"
        | "queues"
        | "more";
    }
  | {
      id: "more";
      type: "more";
      label: string;
      icon: "more";
    };

export const SUPER_ADMIN_MOBILE_PRIMARY_TABS: SuperAdminMobileTab[] = [
  { id: "overview", type: "link", href: "/super-admin", label: "Overview", icon: "governance" },
  {
    id: "live_ops",
    type: "link",
    href: "/super-admin/live-operations",
    label: "Live Ops",
    icon: "queues",
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
