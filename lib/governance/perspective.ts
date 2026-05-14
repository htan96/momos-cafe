/**
 * Operational “lens” for super-admin UX — **not** identity impersonation.
 * Stored in HttpOnly cookie `momos_operational_perspective` via `/api/super-admin/perspective`.
 */

export const OPERATIONAL_PERSPECTIVE_COOKIE = "momos_operational_perspective";

export enum OperationalPerspective {
  governance = "governance",
  admin_operations = "admin_operations",
  customer_experience = "customer_experience",
}

const DEFAULT_ROUTE: Record<OperationalPerspective, string> = {
  [OperationalPerspective.governance]: "/super-admin",
  [OperationalPerspective.admin_operations]: "/admin",
  [OperationalPerspective.customer_experience]: "/account",
};

export function defaultRouteForPerspective(p: OperationalPerspective): string {
  return DEFAULT_ROUTE[p];
}

export function parseOperationalPerspective(raw: string | undefined | null): OperationalPerspective | null {
  if (!raw) return null;
  const v = raw.trim();
  if (v === OperationalPerspective.governance) return OperationalPerspective.governance;
  if (v === OperationalPerspective.admin_operations) return OperationalPerspective.admin_operations;
  if (v === OperationalPerspective.customer_experience) return OperationalPerspective.customer_experience;
  return null;
}

export function perspectiveLabel(p: OperationalPerspective): string {
  switch (p) {
    case OperationalPerspective.governance:
      return "Governance";
    case OperationalPerspective.admin_operations:
      return "Admin operations";
    case OperationalPerspective.customer_experience:
      return "Customer experience";
    default:
      return "Governance";
  }
}
