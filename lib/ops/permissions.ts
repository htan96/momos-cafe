import type { OpsRole } from "@/lib/ops/types";

/** Fine-grained ACL stubs — expand when multi-user ops lands. */
export type OpsPermission =
  | "console:read"
  | "fulfillment:write"
  | "orders:write"
  | "shipping:write"
  | "communications:write"
  | "settings:read"
  | "support:write";

const ROLE_MATRIX: Record<OpsRole, readonly OpsPermission[]> = {
  admin: [
    "console:read",
    "fulfillment:write",
    "orders:write",
    "shipping:write",
    "communications:write",
    "settings:read",
    "support:write",
  ],
  fulfillment: ["console:read", "fulfillment:write", "shipping:write", "settings:read", "support:write"],
  catering: ["console:read", "orders:write", "settings:read", "support:write"],
  support: ["console:read", "orders:write", "communications:write", "settings:read", "support:write"],
  read_only: ["console:read", "settings:read"],
};

export function opsCan(role: OpsRole, perm: OpsPermission): boolean {
  return ROLE_MATRIX[role]?.includes(perm) ?? false;
}
