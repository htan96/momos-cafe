export type StorefrontHeaderNavItem = { readonly href: string; readonly label: string };

/** Primary storefront destinations shown in the global header (desktop + mobile sheet). */
export const STOREFRONT_HEADER_NAV_LINKS: readonly StorefrontHeaderNavItem[] = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/catering", label: "Catering" },
  { href: "/find-us", label: "Find Us" },
  { href: "/our-story", label: "Our Story" },
  { href: "/shop", label: "Shop" },
] as const;
