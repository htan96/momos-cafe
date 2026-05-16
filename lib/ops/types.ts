export type OpsRole = "admin" | "fulfillment" | "catering" | "support" | "read_only";

export interface OpsSessionPayload {
  email: string;
  /** Cognito `sub` — stable actor id for ops actions. */
  sub: string;
  role: OpsRole;
  exp: number;
  /** Cognito group shown in ops chrome (`admin` | `super_admin`). */
  roleBadge?: string;
}
