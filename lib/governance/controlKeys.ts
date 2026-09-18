import type { GovernanceEnforcementLayer, GovernanceRiskLevel } from "@/lib/governance/governanceStatus";

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

/** Kill-switch keys that require confirmation + audit reason when activating a restriction. */
export const HIGH_RISK_GOVERNANCE_CONTROL_KEYS: readonly GovernanceControlKey[] = [
  "checkout_disabled",
  "ordering_disabled",
  "storefront_read_only",
  "registrations_disabled",
  "maintenance_mode",
];

export function isHighRiskGovernanceControlKey(key: GovernanceControlKey): boolean {
  return (HIGH_RISK_GOVERNANCE_CONTROL_KEYS as readonly string[]).includes(key);
}

export function isGovernanceControlKey(v: string): v is GovernanceControlKey {
  return (GOVERNANCE_CONTROL_KEYS as readonly string[]).includes(v);
}

export type GovernanceControlDefinition = {
  key: GovernanceControlKey;
  category: GovernanceControlCategory;
  title: string;
  description: string;
  /** Shown when restriction is off (`enabled` false). */
  activeDescription: string;
  /** Shown when restriction is on (`enabled` true). */
  blockedDescription: string;
  riskLevel: GovernanceRiskLevel;
  enforcementLayers: readonly GovernanceEnforcementLayer[];
  /** Default for `PlatformGovernanceControl.enabled` (restriction off). */
  defaultEnabled: boolean;
};

export const GOVERNANCE_CONTROL_DEFINITIONS: Record<GovernanceControlKey, GovernanceControlDefinition> = {
  checkout_disabled: {
    key: "checkout_disabled",
    category: "commerce",
    title: "Checkout",
    description:
      "Blocks checkout summary, payment registration, draft commerce orders, and legacy paid order posts. Returns 403 CHECKOUT_DISABLED.",
    activeDescription: "Customers can currently complete purchases.",
    blockedDescription: "Customers cannot currently complete purchases.",
    riskLevel: "high",
    enforcementLayers: ["governance_kill_switch"],
    defaultEnabled: false,
  },
  ordering_disabled: {
    key: "ordering_disabled",
    category: "commerce",
    title: "Ordering",
    description:
      "Blocks cart mutations and placing commerce orders (POST /api/cart/session, POST /api/orders). Returns 403 ORDERING_DISABLED.",
    activeDescription: "Customers can currently add items and place orders.",
    blockedDescription: "Cart mutations and new orders are currently blocked.",
    riskLevel: "high",
    enforcementLayers: ["governance_kill_switch"],
    defaultEnabled: false,
  },
  registrations_disabled: {
    key: "registrations_disabled",
    category: "access",
    title: "Customer registration",
    description: "Blocks new Cognito sign-ups (POST /api/auth/cognito/signup). Returns 403 REGISTRATIONS_DISABLED.",
    activeDescription: "New customers can currently create accounts.",
    blockedDescription: "New customer registrations are currently blocked.",
    riskLevel: "high",
    enforcementLayers: ["governance_kill_switch", "authentication_system"],
    defaultEnabled: false,
  },
  storefront_read_only: {
    key: "storefront_read_only",
    category: "commerce",
    title: "Storefront read-only",
    description:
      "Commerce writes blocked (same routes as ordering disabled). Use when catalog should stay visible but carts/orders must stop. Returns 403 STOREFRONT_READ_ONLY.",
    activeDescription: "Storefront browsing is available; commerce writes are allowed.",
    blockedDescription: "Storefront is read-only — carts and order writes are blocked.",
    riskLevel: "high",
    enforcementLayers: ["governance_kill_switch"],
    defaultEnabled: false,
  },
  maintenance_mode: {
    key: "maintenance_mode",
    category: "emergency",
    title: "Full maintenance",
    description:
      "Closes both retail and café gates via AppSetting (ShopEnabled / MenuEnabled). Existing maintenance overlays and API guards apply.",
    activeDescription: "Storefront gates follow admin maintenance settings under normal governance.",
    blockedDescription: "Full maintenance is active — retail shop and café menu gates are closed.",
    riskLevel: "high",
    enforcementLayers: ["governance_kill_switch", "maintenance_system"],
    defaultEnabled: false,
  },
  menu_hidden: {
    key: "menu_hidden",
    category: "content",
    title: "Menu hidden",
    description:
      "Sets MenuEnabled to closed in AppSetting while leaving shop availability under maintenance or other controls.",
    activeDescription: "Café menu ordering surface is available when shop gates allow.",
    blockedDescription: "Café menu is hidden — kitchen ordering surfaces show maintenance.",
    riskLevel: "medium",
    enforcementLayers: ["governance_kill_switch", "maintenance_system"],
    defaultEnabled: false,
  },
};

/** UI status for a kill switch (`enabled` = restriction ON). */
export function governanceControlOperationalStatus(restrictionEnabled: boolean): "ACTIVE" | "BLOCKED" {
  return restrictionEnabled ? "BLOCKED" : "ACTIVE";
}

export function governanceControlStatusDescription(
  key: GovernanceControlKey,
  restrictionEnabled: boolean
): string {
  const def = GOVERNANCE_CONTROL_DEFINITIONS[key];
  return restrictionEnabled ? def.blockedDescription : def.activeDescription;
}
