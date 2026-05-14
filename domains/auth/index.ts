/** Auth domain — pointers to Cognito + capability typing (no middleware changes). */
export type { CognitoGroup } from "@/lib/auth/cognito/types";
export {
  defaultRouteForGroups,
  hasAnyRole,
  hasRole,
  isAdmin,
  isCustomer,
  isSuperAdmin,
  KNOWN_COGNITO_GROUPS,
} from "@/lib/auth/cognito/roles";
export {
  assertAdminPlatformLayout,
  assertAuthedPlatformLayout,
  assertCustomerPlatformLayout,
  assertSuperAdminPlatformLayout,
} from "@/lib/auth/cognito/assertRoleInLayout";
export type { PlatformCapability, RoleCapabilityMatrix } from "@/domains/auth/permissions";
