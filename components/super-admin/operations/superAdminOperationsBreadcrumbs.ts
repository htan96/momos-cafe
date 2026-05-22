import type { OperationalBreadcrumbSegment } from "@/components/super-admin/operations/OperationalBreadcrumbs";

/** Middle crumb links into the Operations domain (failures inbox is first sidebar row). */
export function superAdminOperationsBreadcrumbs(leafLabel: string): OperationalBreadcrumbSegment[] {
  return [
    { label: "Super-admin", href: "/super-admin" },
    { label: "Operations", href: "/super-admin/operations/failures" },
    { label: leafLabel },
  ];
}

/** Middle crumb links into the Commerce domain (order operations workspace first). */
export function superAdminCommerceBreadcrumbs(leafLabel: string): OperationalBreadcrumbSegment[] {
  return [
    { label: "Super-admin", href: "/super-admin" },
    { label: "Commerce", href: "/super-admin/order-operations" },
    { label: leafLabel },
  ];
}

/** Middle crumb aligns with sidebar Platform tooling (integrations hub). */
export function superAdminPlatformBreadcrumbs(leafLabel: string): OperationalBreadcrumbSegment[] {
  return [
    { label: "Super-admin", href: "/super-admin" },
    { label: "Platform", href: "/super-admin/system/integrations" },
    { label: leafLabel },
  ];
}

/** Breadcrumbs under the Identity IA domain (staff roster as section landing). */
export function superAdminIdentityBreadcrumbs(
  tail: OperationalBreadcrumbSegment[],
): OperationalBreadcrumbSegment[] {
  return [
    { label: "Super-admin", href: "/super-admin" },
    { label: "Identity", href: "/super-admin/users/admins" },
    ...tail,
  ];
}
