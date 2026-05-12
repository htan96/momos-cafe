import type { OpsRole } from "@/lib/ops/types";

/** Fine-grained ACL stubs — expand when multi-user ops lands. */
export type OpsPermission =
  | "console:read"
  | "fulfillment:write"
  | "orders:write"
  | "shipping:write"
  | "communications:write"
  | "settings:read";

const ROLE_MATRIX: Record<OpsRole, readonly OpsPermission[]> = {
  admin: [
    "console:read",
    "fulfillment:write",
    "orders:write",
    "shipping:write",
    "communications:write",
    "settings:read",
  ],
  fulfillment: ["console:read", "fulfillment:write", "shipping:write", "settings:read"],
  catering: ["console:read", "orders:write", "settings:read"],
  support: ["console:read", "orders:write", "communications:write", "settings:read"],
  read_only: ["console:read", "settings:read"],
};

export function opsCan(role: OpsRole, perm: OpsPermission): boolean {
  return ROLE_MATRIX[role]?.includes(perm) ?? false;
}
