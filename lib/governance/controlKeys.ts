/** Categories persisted on `PlatformGovernanceControl.category`. */
export type GovernanceControlCategory = "commerce" | "access" | "emergency" | "content";

export const GOVERNANCE_CONTROL_KEYS = [
  "checkout_disabled",
  "ordering_disabled",
  "registrations_disabled",
  "storefront_read_only",
  "maintenance_mode",
  "menu_hidden",
] as const;

export type GovernanceControlKey = (typeof GOVERNANCE_CONTROL_KEYS)[number];

export function isGovernanceControlKey(v: string): v is GovernanceControlKey {
  return (GOVERNANCE_CONTROL_KEYS as readonly string[]).includes(v);
}

export type GovernanceControlDefinition = {
  key: GovernanceControlKey;
  category: GovernanceControlCategory;
  title: string;
  description: string;
  /** Default for `PlatformGovernanceControl.enabled` (restriction off). */
  defaultEnabled: boolean;
};

export const GOVERNANCE_CONTROL_DEFINITIONS: Record<GovernanceControlKey, GovernanceControlDefinition> = {
  checkout_disabled: {
    key: "checkout_disabled",
    category: "commerce",
    title: "Checkout disabled",
    description:
      "Blocks checkout summary, payment registration, draft commerce orders, and legacy paid order posts. Returns 403 CHECKOUT_DISABLED.",
    defaultEnabled: false,
  },
  ordering_disabled: {
    key: "ordering_disabled",
    category: "commerce",
    title: "Ordering disabled",
    description:
      "Blocks cart mutations and placing commerce orders (POST /api/cart/session, POST /api/orders). Returns 403 ORDERING_DISABLED.",
    defaultEnabled: false,
  },
  registrations_disabled: {
    key: "registrations_disabled",
    category: "access",
    title: "Registrations disabled",
    description: "Blocks new Cognito sign-ups (POST /api/auth/cognito/signup). Returns 403 REGISTRATIONS_DISABLED.",
    defaultEnabled: false,
  },
  storefront_read_only: {
    key: "storefront_read_only",
    category: "commerce",
    title: "Storefront read-only",
    description:
      "Commerce writes blocked (same routes as ordering disabled). Use when catalog should stay visible but carts/orders must stop. Returns 403 STOREFRONT_READ_ONLY.",
    defaultEnabled: false,
  },
  maintenance_mode: {
    key: "maintenance_mode",
    category: "emergency",
    title: "Full maintenance",
    description:
      "Closes both retail and café gates via AppSetting (ShopEnabled / MenuEnabled). Existing maintenance overlays and API guards apply.",
    defaultEnabled: false,
  },
  menu_hidden: {
    key: "menu_hidden",
    category: "content",
    title: "Menu hidden",
    description:
      "Sets MenuEnabled to closed in AppSetting while leaving shop availability under maintenance or other controls.",
    defaultEnabled: false,
  },
};
