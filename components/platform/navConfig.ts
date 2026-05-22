import type { PlatformNavItem } from "@/components/platform/PlatformShell";
import type { SuperAdminNavSection } from "@/components/platform/superAdminNavMeta";

/** Super-admin sidebar row — `section` is an IA bucket key (see {@link SuperAdminNavSection}). */
export type SuperAdminPlatformNavItem = PlatformNavItem & { section: SuperAdminNavSection };

export type { SuperAdminNavSection } from "@/components/platform/superAdminNavMeta";

/** Customer portal — `/account` (+ settings under `/account/settings/*`, not all linked in nav). */
export const ACCOUNT_PLATFORM_NAV: PlatformNavItem[] = [
  { section: "Overview", href: "/account", label: "Overview" },
  { section: "Orders", href: "/account/orders", label: "Orders" },
  { section: "Account", href: "/account/settings/profile", label: "Profile" },
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
  { section: "OVERVIEW", href: "/super-admin", label: "Overview" },
  { section: "OVERVIEW", href: "/super-admin/live-activity", label: "Live Activity" },
  { section: "OVERVIEW", href: "/super-admin/incidents", label: "Incidents" },
  { section: "OPERATIONS", href: "/super-admin/operations/failures", label: "Failures" },
  { section: "OPERATIONS", href: "/super-admin/operations/webhook-replay", label: "Webhook replay" },
  {
    section: "OPERATIONS",
    href: "/super-admin/operations/lifecycle-integrity",
    label: "Lifecycle integrity",
    navHelperText: "Cross-domain coordination scan · visibility only",
  },
  {
    section: "OPERATIONS",
    href: "/super-admin/operations/notifications-health",
    label: "Notification health",
    navHelperText: "Outbox lifecycle, backlog buckets, stale-lease tooling",
  },
  {
    section: "OPERATIONS",
    href: "/super-admin/operations/safety",
    label: "Operational safety",
    navHelperText: "Cross-domain Postgres + governance diagnostics",
  },
  {
    section: "OPERATIONS",
    href: "/super-admin/operations/readiness",
    label: "Readiness",
    navHelperText: "Env deployment scan + safety rollup",
  },
  {
    section: "COMMERCE",
    href: "/super-admin/order-operations",
    label: "Order operations",
    navHelperText: "Commerce order workspace (`/operations/orders` redirects here)",
  },
  {
    section: "COMMERCE",
    href: "/super-admin/order-operations/legacy",
    label: "Legacy orders",
    navHelperText: "Historical cafe order archive",
  },
  { section: "COMMERCE", href: "/super-admin/operations/payments", label: "Payments" },
  {
    section: "COMMERCE",
    href: "/super-admin/operations/payment-integrity",
    label: "Payment integrity",
    navHelperText: "PSP coordination checks · read-only",
  },
  {
    section: "COMMERCE",
    href: "/super-admin/operations/deliveries",
    label: "Shipments",
    navHelperText: "Shipping operations workspace entry",
  },
  { section: "IDENTITY", href: "/super-admin/users/customers", label: "Customers" },
  { section: "IDENTITY", href: "/super-admin/users/admins", label: "Staff & admins" },
  {
    section: "IDENTITY",
    href: "/super-admin/users/permissions",
    label: "Roles & permissions",
  },
  {
    section: "IDENTITY",
    href: "/super-admin/operations/operational-identity",
    label: "Operational identity",
    navHelperText: "Cognito + prisma dossier · narrow group edits",
  },
  { section: "GOVERNANCE", href: "/super-admin/platform/feature-controls", label: "Feature controls" },
  {
    section: "GOVERNANCE",
    href: "/super-admin/platform/maintenance",
    label: "Maintenance",
    navHelperText: "Opens admin storefront gates — authenticated area",
  },
  {
    section: "GOVERNANCE",
    href: "/super-admin/platform/communication-registry",
    label: "Communications registry",
    navHelperText: "Transactional / SES catalog — governance read-only",
  },
  { section: "GOVERNANCE", href: "/super-admin/security/audit-logs", label: "Audit logs" },
  {
    section: "PLATFORM",
    href: "/super-admin/operations/shippo-webhooks",
    label: "Shippo webhooks",
    navHelperText: "Receipt health + orphans (72h window)",
  },
  { section: "PLATFORM", href: "/super-admin/system/integrations", label: "Integrations" },
  { section: "PLATFORM", href: "/super-admin/system/service-health", label: "Service health" },
];

export const PORTAL_PLATFORM_NAV: PlatformNavItem[] = [{ href: "/portal", label: "Home" }];
