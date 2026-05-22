import type { OperationalBreadcrumbSegment } from "@/components/super-admin/operations/OperationalBreadcrumbs";

/** Middle crumb links to the first Operations nav entry (commerce orders workspace). */
export function superAdminOperationsBreadcrumbs(leafLabel: string): OperationalBreadcrumbSegment[] {
  return [
    { label: "Super-admin", href: "/super-admin" },
    { label: "Operations", href: "/super-admin/operations/orders" },
    { label: leafLabel },
  ];
}
