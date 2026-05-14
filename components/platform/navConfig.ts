import type { PlatformNavItem } from "@/components/platform/PlatformShell";

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
export const SUPER_ADMIN_PLATFORM_NAV: PlatformNavItem[] = [
  { section: "Platform", href: "/super-admin", label: "Dashboard" },
  { href: "/super-admin/settings/platform", label: "Global settings" },
  { href: "/super-admin/settings/restaurant", label: "Restaurant hours" },
  { section: "Access", href: "/super-admin/roles", label: "Roles" },
  { href: "/super-admin/admins", label: "Admins" },
  { href: "/super-admin/cognito-tools", label: "Cognito" },
  { section: "Governance", href: "/super-admin/audit", label: "Audit" },
  { href: "/super-admin/settings/security", label: "Security" },
  { href: "/super-admin/customer-lookup", label: "Customers" },
  { section: "System", href: "/super-admin/settings/integrations", label: "Integrations" },
  { href: "/super-admin/settings/health", label: "Health" },
  { href: "/admin/settings/maintenance", label: "Maintenance" },
];

export const PORTAL_PLATFORM_NAV: PlatformNavItem[] = [{ href: "/portal", label: "Home" }];
