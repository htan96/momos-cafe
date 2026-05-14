/**
 * Static capability maps aligned to Cognito groups in this codebase
 * ({@link CognitoGroup}: `customer`, `admin`, `super_admin`).
 */
export type CognitoRoleCatalogEntry = {
  id: "customer" | "admin" | "super_admin";
  cognitoGroup: string;
  title: string;
  description: string;
  capabilities: readonly string[];
  routePrefixes: readonly string[];
  elevated: readonly string[];
};

export const COGNITO_ROLE_CATALOG: readonly CognitoRoleCatalogEntry[] = [
  {
    id: "customer",
    cognitoGroup: "customer",
    title: "Customer",
    description: "Default storefront diners tied to the `customer` Cognito group.",
    capabilities: [
      "Shop, menu, and checkout routes gated by maintenance flags in AppSetting",
      "Self-service account area when the customer_platform feature is enabled",
    ],
    routePrefixes: ["/account", "/", "/menu", "/order", "/shop"],
    elevated: [],
  },
  {
    id: "admin",
    cognitoGroup: "admin",
    title: "Admin",
    description: "Operators in the `admin` group — location and fulfillment tooling.",
    capabilities: [
      "Admin surfaces under `/admin` (exact prefixes from `COGNITO_PROTECTED_PREFIXES` when set)",
      "No super-admin governance APIs or impersonation controls",
    ],
    routePrefixes: ["/admin"],
    elevated: ["Super-admin-only paths remain blocked at middleware / session guards"],
  },
  {
    id: "super_admin",
    cognitoGroup: "super_admin",
    title: "Super admin",
    description: "Smallest roster; Cognito group `super_admin` unlocks `/super-admin` and governance APIs.",
    capabilities: [
      "Platform feature toggles (`PlatformFeatureToggle`) via `/api/super-admin/platform-features`",
      "Perspective cookie and customer impersonation (audited in `GovernanceAuditEvent`)",
    ],
    routePrefixes: ["/super-admin"],
    elevated: ["Break-glass preview when customer_platform is off but override group matches"],
  },
] as const;
