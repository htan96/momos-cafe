export type SuperAdminNavSection =
  | "COMMAND_CENTER"
  | "OPERATIONS"
  | "USERS"
  | "PLATFORM"
  | "SECURITY"
  | "SYSTEM";

export const SUPER_ADMIN_SECTION_LABEL: Record<SuperAdminNavSection, string> = {
  COMMAND_CENTER: "COMMAND CENTER",
  OPERATIONS: "OPERATIONS",
  USERS: "USERS",
  PLATFORM: "PLATFORM",
  SECURITY: "SECURITY",
  SYSTEM: "SYSTEM",
};
