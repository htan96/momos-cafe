import type { PlatformNavItem } from "@/components/platform/PlatformShell";
import type { SuperAdminNavSection } from "@/components/platform/superAdminNavMeta";

/** Super-admin sidebar row — `section` is an IA bucket key (see {@link SuperAdminNavSection}). */
export type SuperAdminPlatformNavItem = PlatformNavItem & { section: SuperAdminNavSection };

export type { SuperAdminNavSection } from "@/components/platform/superAdminNavMeta";

/** Customer portal — routes under `/account/*`. Settings live under `/account/settings/*`. */
export const ACCOUNT_PLATFORM_NAV: PlatformNavItem[] = [
  { section: "Overview", href: "/account", label: "Dashboard" },
  { section: "Orders & delivery", href: "/account/orders", label: "Orders" },
  { href: "/account/shipments", label: "Shipments" },
  { section: "Programs", href: "/account/catering-requests", label: "Catering" },
  { href: "/account/rewards", label: "Rewards" },
  { section: "Records", href: "/account/invoices", label: "Invoices" },
  { section: "Account", href: "/account/settings", label: "Settings" },
];

/** Staff ops — routes under `/admin/*`. Operational settings under `/admin/settings/*` (maintenance stays put). */
export const ADMIN_PLATFORM_NAV: PlatformNavItem[] = [
  { section: "Overview", href: "/admin", label: "Dashboard" },
  { section: "Fulfillment", href: "/admin/fulfillment", label: "Fulfillment" },
  { href: "/admin/shipping", label: "Shipping" },
  { href: "/admin/order-lookup", label: "Orders" },
  { href: "/admin/catering-orders", label: "Catering" },
  { href: "/admin/catering-inquiries", label: "Catering inquiries" },
  { section: "Customers & menu", href: "/admin/accounts", label: "Accounts" },
  { href: "/admin/customer-lookup", label: "Customers" },
  { href: "/admin/catalog", label: "Catalog" },
  { section: "Service", href: "/admin/support", label: "Support" },
  { href: "/admin/communications", label: "Communications" },
  { section: "Insights", href: "/admin/reporting", label: "Reporting" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/queues", label: "Queues" },
  { href: "/admin/refunds", label: "Refunds" },
  { section: "Settings", href: "/admin/settings/business", label: "Business" },
  { href: "/admin/settings/maintenance", label: "Maintenance" },
];

/** Super-admin — routes under `/super-admin/*`; cross-linked admin routes noted in helper copy when relevant. */
export const SUPER_ADMIN_PLATFORM_NAV: SuperAdminPlatformNavItem[] = [
  { section: "COMMAND_CENTER", href: "/super-admin", label: "Overview" },
  { section: "COMMAND_CENTER", href: "/super-admin/live-activity", label: "Live Activity" },
  { section: "COMMAND_CENTER", href: "/super-admin/incidents", label: "Incidents" },
  { section: "OPERATIONS", href: "/super-admin/operations/orders", label: "Orders", navHelperText: "Unified commerce_orders" },
  { section: "OPERATIONS", href: "/super-admin/order-operations/legacy", label: "Legacy orders" },
  { section: "OPERATIONS", href: "/super-admin/operations/failures", label: "Failures" },
  { section: "OPERATIONS", href: "/super-admin/operations/payments", label: "Payments" },
  {
    section: "OPERATIONS",
    href: "/super-admin/operations/deliveries",
    label: "Shipments",
    navHelperText: "Redirects to shipping operations workspace",
  },
  { section: "USERS", href: "/super-admin/users/customers", label: "Customers" },
  { section: "USERS", href: "/super-admin/users/admins", label: "Admins" },
  { section: "USERS", href: "/super-admin/users/permissions", label: "Permissions" },
  { section: "PLATFORM", href: "/super-admin/platform/feature-controls", label: "Feature Controls" },
  {
    section: "PLATFORM",
    href: "/super-admin/platform/communication-registry",
    label: "Communications registry",
    navHelperText: "Transactional / SES catalog — governance read-only",
  },
  {
    section: "PLATFORM",
    href: "/super-admin/platform/maintenance",
    label: "Maintenance",
    navHelperText: "Opens admin storefront gates — authenticated area",
  },
  { section: "SECURITY", href: "/super-admin/security/audit-logs", label: "Audit Logs" },
  { section: "SYSTEM", href: "/super-admin/system/service-health", label: "Service Health" },
  { section: "SYSTEM", href: "/super-admin/system/integrations", label: "Integrations" },
];

export const PORTAL_PLATFORM_NAV: PlatformNavItem[] = [{ href: "/portal", label: "Home" }];
