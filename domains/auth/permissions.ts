import type { CognitoGroup } from "@/lib/auth/cognito/types";

/** Feature flags for coarse RBAC overlays (Cognito groups remain authoritative). */
export type PlatformCapability =
  | "commerce:read"
  | "commerce:write"
  | "ops:fulfillment"
  | "ops:shipping"
  | "support:read"
  | "support:write"
  | "platform:settings"
  | "platform.security:audit";

/** Matrix keyed by Cognito-facing role bucket — illustrative, not exhaustive. */
export type RoleCapabilityMatrix = Partial<
  Record<Exclude<CognitoGroup, "customer">, readonly PlatformCapability[]>
>;
