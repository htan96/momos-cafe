/** Super-admin sidebar domain keys — mental ops model (not repo build order). */
export type SuperAdminNavSection =
  | "OVERVIEW"
  | "OPERATIONS"
  | "COMMERCE"
  | "IDENTITY"
  | "GOVERNANCE"
  | "PLATFORM";

export const SUPER_ADMIN_SECTION_LABEL: Record<SuperAdminNavSection, string> = {
  OVERVIEW: "OVERVIEW",
  OPERATIONS: "OPERATIONS",
  COMMERCE: "COMMERCE",
  IDENTITY: "IDENTITY",
  GOVERNANCE: "GOVERNANCE",
  PLATFORM: "PLATFORM",
};

/** One-line IA hint under each domain heading (desktop sidebar). */
export const SUPER_ADMIN_SECTION_SUBTITLE: Record<SuperAdminNavSection, string> = {
  OVERVIEW: "Posture: entry, live telemetry, incidents.",
  OPERATIONS: "Reliability surfaces: pipelines, scans, tooling.",
  COMMERCE: "Orders, payment rails, shipments.",
  IDENTITY: "Customers, staff, roles, dossiers.",
  GOVERNANCE: "Feature gates, storefront maintenance, audit.",
  PLATFORM: "Vendor webhooks, integrations, runtime health.",
};
