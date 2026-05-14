import type { StorefrontNavIconId } from "@/lib/navigation/storefrontMobileNav";

export type CustomerMobileTab = {
  id: string;
  type: "link";
  href: string;
  label: string;
  icon: StorefrontNavIconId | "orders" | "rewards" | "messages" | "settings";
};

/** Primary tabs for `/account/*` (mobile). */
export const CUSTOMER_MOBILE_TABS: CustomerMobileTab[] = [
  { id: "overview", type: "link", href: "/account", label: "Home", icon: "home" },
  { id: "orders", type: "link", href: "/account/orders", label: "Orders", icon: "orders" },
  { id: "rewards", type: "link", href: "/account/rewards", label: "Rewards", icon: "rewards" },
  {
    id: "messages",
    type: "link",
    href: "/account/settings/communication",
    label: "Messages",
    icon: "messages",
  },
  { id: "settings", type: "link", href: "/account/settings", label: "Settings", icon: "settings" },
];
