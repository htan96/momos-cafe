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
    description: "Default diner posture for storefront patrons — checkout, perks, loyalty, and comms routed through storefront flows.",
    capabilities: [
      "Browse menus and place carts while storefront maintenance banners remain honest",
      "Optional self-service account hub when commerce leadership enables guest tooling",
    ],
    routePrefixes: ["/account", "/", "/menu", "/order", "/shop"],
    elevated: [],
  },
  {
    id: "admin",
    cognitoGroup: "admin",
    title: "Admin",
    description: "Run-the-business operators — menus, fulfillment boards, refunds, staffing queues — without unlocking governance consoles.",
    capabilities: [
      "Merchant-facing shell anchored at `/admin` for hourly operations",
      "Cannot reach super-admin paths, impersonation starters, or platform-wide kill switches meant for auditors",
    ],
    routePrefixes: ["/admin"],
    elevated: [
      "If business policy demands break-glass, pair with infra to land the correct pool group vs. improvising shortcuts",
    ],
  },
  {
    id: "super_admin",
    cognitoGroup: "super_admin",
    title: "Super admin",
    description: "Tight cohort whose Cognito enrollment unlocks audited infrastructure for governance, impersonation envelopes, and platform controls.",
    capabilities: [
      "Flip sanctioned platform governors when operations leadership aligns on blast radius",
      "Launch customer-scope impersonation with ticket-grade justification streamed into governance timelines",
      "Maintain operational perspective overlays when incident command rotates",
    ],
    routePrefixes: ["/super-admin"],
    elevated: [
      "Customer-facing overlays still respect storefront maintenance choreography — super-admin clears policy, not customer consent",
    ],
  },
] as const;
