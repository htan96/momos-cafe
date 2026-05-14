import type { CognitoGroup } from "@/lib/auth/cognito/types";

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
    defaultEnabled: true,
    allowOverrideRoles: ["super_admin"] as const,
    rolloutNotes: "When off, storefront guests keep shopping; only override roles preview the operational shell.",
  },
  rewards: {
    key: "rewards",
    title: "Rewards & perks",
    description: "Earn paths, tiers, and celebratory perks surfaced in-account and wherever loyalty copy appears.",
    defaultEnabled: false,
    allowOverrideRoles: ["super_admin"] as const,
    rolloutNotes: "Pair with UX copy audits before enabling broadly.",
  },
  catering_portal: {
    key: "catering_portal",
    title: "Catering concierge surfaces",
    description: "Catering request threads and venue-specific intake beyond the marketing cater form.",
    defaultEnabled: false,
    allowOverrideRoles: ["super_admin"] as const,
    rolloutNotes: "Franchises may stagger access; storefront inquiry forms stay unaffected.",
  },
  notifications: {
    key: "notifications",
    title: "Operational notifications",
    description: "In-account comms rails and transactional nudge surfacing tuned for hospitality pacing.",
    defaultEnabled: true,
    allowOverrideRoles: ["super_admin"] as const,
    rolloutNotes: "Quiet defaults — escalate only after deliverability QA.",
  },
  shipment_visibility: {
    key: "shipment_visibility",
    title: "Shipment visibility",
    description: "Package tracking timelines and reassurance copy for mailed gifts.",
    defaultEnabled: true,
    allowOverrideRoles: ["super_admin"] as const,
    rolloutNotes: "Fulfillment SLA bias remains separate ops tuning.",
  },
};
