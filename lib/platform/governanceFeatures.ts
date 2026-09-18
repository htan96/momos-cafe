import type { CognitoGroup } from "@/lib/auth/cognito/types";
import type { GovernanceEnforcementLayer, GovernanceRiskLevel } from "@/lib/governance/governanceStatus";

export const PLATFORM_FEATURE_KEYS = [
  "customer_platform",
  "rewards",
  "catering_portal",
  "notifications",
  "shipment_visibility",
] as const;

export type PlatformFeatureKey = (typeof PLATFORM_FEATURE_KEYS)[number];

export type PlatformFeatureDefinition = {
  key: PlatformFeatureKey;
  title: string;
  description: string;
  activeDescription: string;
  disabledDescription: string;
  riskLevel: GovernanceRiskLevel;
  category: "platform";
  enforcementLayers: readonly GovernanceEnforcementLayer[];
  defaultEnabled: boolean;
  /** Cognito groups that may use the capability when governance has it switched off (`super_admin` first). */
  allowOverrideRoles: readonly CognitoGroup[];
  rolloutNotes?: string;
};

export const PLATFORM_FEATURE_DEFINITIONS: Readonly<
  Record<PlatformFeatureKey, PlatformFeatureDefinition>
> = {
  customer_platform: {
    key: "customer_platform",
    title: "Customer account platform",
    description:
      "Signed-in hospitality hub — orders history, shipments, catering threads, rewards, and account settings.",
    activeDescription: "Signed-in customer hub surfaces are available for eligible accounts.",
    disabledDescription: "Customer account platform is disabled — override roles may still preview.",
    riskLevel: "medium",
    category: "platform",
    enforcementLayers: ["feature_flag"],
    defaultEnabled: true,
    allowOverrideRoles: ["super_admin"] as const,
    rolloutNotes: "When off, storefront guests keep shopping; only override roles preview the operational shell.",
  },
  rewards: {
    key: "rewards",
    title: "Rewards & perks",
    description: "Earn paths, tiers, and celebratory perks surfaced in-account and wherever loyalty copy appears.",
    activeDescription: "Rewards and loyalty surfaces are visible in-account.",
    disabledDescription: "Rewards surfaces are hidden — rollout copy may still reference perks elsewhere.",
    riskLevel: "low",
    category: "platform",
    enforcementLayers: ["feature_flag"],
    defaultEnabled: false,
    allowOverrideRoles: ["super_admin"] as const,
    rolloutNotes: "Pair with UX copy audits before enabling broadly.",
  },
  catering_portal: {
    key: "catering_portal",
    title: "Catering concierge surfaces",
    description: "Catering request threads and venue-specific intake beyond the marketing cater form.",
    activeDescription: "Catering concierge threads are available in the customer shell.",
    disabledDescription: "Catering portal surfaces are disabled — marketing forms remain available.",
    riskLevel: "low",
    category: "platform",
    enforcementLayers: ["feature_flag"],
    defaultEnabled: false,
    allowOverrideRoles: ["super_admin"] as const,
    rolloutNotes: "Franchises may stagger access; storefront inquiry forms stay unaffected.",
  },
  notifications: {
    key: "notifications",
    title: "Operational notifications",
    description: "In-account comms rails and transactional nudge surfacing tuned for hospitality pacing.",
    activeDescription: "In-account notification rails are active.",
    disabledDescription: "Operational notification surfacing is disabled in the customer shell.",
    riskLevel: "medium",
    category: "platform",
    enforcementLayers: ["feature_flag"],
    defaultEnabled: true,
    allowOverrideRoles: ["super_admin"] as const,
    rolloutNotes: "Quiet defaults — escalate only after deliverability QA.",
  },
  shipment_visibility: {
    key: "shipment_visibility",
    title: "Shipment visibility",
    description: "Package tracking timelines and reassurance copy for mailed gifts.",
    activeDescription: "Shipment tracking timelines are visible to customers.",
    disabledDescription: "Shipment visibility is hidden in the customer shell.",
    riskLevel: "low",
    category: "platform",
    enforcementLayers: ["feature_flag"],
    defaultEnabled: true,
    allowOverrideRoles: ["super_admin"] as const,
    rolloutNotes: "Fulfillment SLA bias remains separate ops tuning.",
  },
};

export function platformFeatureOperationalStatus(featureEnabled: boolean): "ACTIVE" | "DISABLED" {
  return featureEnabled ? "ACTIVE" : "DISABLED";
}

export function platformFeatureStatusDescription(key: PlatformFeatureKey, featureEnabled: boolean): string {
  const def = PLATFORM_FEATURE_DEFINITIONS[key];
  return featureEnabled ? def.activeDescription : def.disabledDescription;
}
