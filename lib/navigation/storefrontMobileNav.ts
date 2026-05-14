export type StorefrontNavIconId =
  | "home"
  | "menu"
  | "order"
  | "cart"
  | "account"
  | "signIn";

export type StorefrontMobileTab =
  | { id: string; type: "link"; href: string; label: string; icon: StorefrontNavIconId }
  | { id: "cart"; type: "cart"; label: string; icon: StorefrontNavIconId }
  | {
      id: "auth";
      type: "auth";
      guest: { href: string; label: string };
      customer: { href: string; label: string };
    };

export function getStorefrontMobileTabs(): StorefrontMobileTab[] {
  const auth: StorefrontMobileTab = {
    id: "auth",
    type: "auth",
    guest: { href: "/login", label: "Sign in" },
    customer: { href: "/account", label: "Account" },
  };

  return [
    { id: "home", type: "link", href: "/", label: "Home", icon: "home" },
    { id: "menu", type: "link", href: "/menu", label: "Menu", icon: "menu" },
    { id: "order", type: "link", href: "/order", label: "Order", icon: "order" },
    { id: "cart", type: "cart", label: "Cart", icon: "cart" },
    auth,
  ];
}
