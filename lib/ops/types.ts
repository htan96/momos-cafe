export type OpsRole = "admin" | "fulfillment" | "catering" | "support" | "read_only";

export interface OpsSessionPayload {
  email: string;
  role: OpsRole;
  exp: number;
}
