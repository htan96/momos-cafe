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
  { section: "Customers & menu", href: "/admin/customer-lookup", label: "Customers" },
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

/** Governance — routes under `/super-admin/*` and linked ops paths where shared. */
export const SUPER_ADMIN_PLATFORM_NAV: SuperAdminPlatformNavItem[] = [
  { section: "PLATFORM", href: "/super-admin", label: "Overview" },
  { section: "PLATFORM", href: "/super-admin/live-operations", label: "Live Operations" },
  { section: "PLATFORM", href: "/super-admin/order-operations", label: "Order operations" },
  { section: "PLATFORM", href: "/super-admin/shipping-operations", label: "Shipping operations" },
  { section: "PLATFORM", href: "/super-admin/catering-inquiries", label: "Catering inquiries" },
  { section: "PLATFORM", href: "/super-admin/settings/platform", label: "Global Settings" },
  { section: "ACCESS", href: "/super-admin/admins", label: "Admins" },
  { section: "ACCESS", href: "/super-admin/roles", label: "Roles" },
  { section: "ACCESS", href: "/super-admin/customer-lookup", label: "Customers" },
  { section: "ACCESS", href: "/super-admin/customer-operations", label: "Customer operations" },
  { section: "ACCESS", href: "/super-admin/cognito-tools", label: "Cognito / Authentication" },
  { section: "GOVERNANCE", href: "/super-admin/audit", label: "Audit Logs" },
  { section: "GOVERNANCE", href: "/super-admin/settings/security", label: "Security" },
  {
    section: "GOVERNANCE",
    href: "/admin/settings/maintenance",
    label: "Maintenance Controls",
    navHelperText: "Admin settings · super admins may open",
  },
  { section: "SYSTEM", href: "/super-admin/settings/integrations", label: "Integrations" },
  { section: "SYSTEM", href: "/super-admin/settings/health", label: "Health Monitoring" },
];

export const PORTAL_PLATFORM_NAV: PlatformNavItem[] = [{ href: "/portal", label: "Home" }];
