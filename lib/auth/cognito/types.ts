import type { AuthUser } from "@/lib/auth/AuthProvider";

export type CognitoGroup = "super_admin" | "admin" | "employee" | "customer";

/** Same shape as {@link AuthUser} — alias documents Cognito as the current IdP implementation. */
export type CognitoSessionUser = AuthUser;
