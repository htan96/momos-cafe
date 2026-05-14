import type { AuditTimelineRow } from "@/components/governance/AuditTimeline";
import type { StatusPillVariant } from "@/components/governance/StatusPill";

/** Subsystem chips for control center summary */
export type SystemStatusChip = {
  id: string;
  label: string;
  variant: StatusPillVariant;
  pillLabel: string;
};

export type GovernanceAlertRow = {
  id: string;
  title: string;
  detail: string;
  variant: StatusPillVariant;
  badge: string;
};

export type RecentAdminAction = {
  id: string;
  actor: string;
  action: string;
  relativeTime: string;
};

export type SecurityHighlightSnippet = {
  title: string;
  body: string;
};

export type MockAdminDirectoryRow = {
  id: string;
  name: string;
  email: string;
  roles: readonly string[];
  lastActivity: string;
  status: StatusPillVariant;
  statusLabel: string;
  invitationPending: boolean;
};

export type MockIntegration = {
  name: string;
  envLabel: string;
  status: StatusPillVariant;
  statusLabel: string;
  lastSyncLine: string;
};

export type MockQueueRow = {
  name: string;
  depth: string;
  oldestAge: string;
  slaHint: string;
};

export type MockRoleCard = {
  id: "customer" | "admin" | "super_admin";
  title: string;
  description: string;
  capabilities: readonly string[];
  routePrefixes: readonly string[];
  elevated: readonly string[];
};

export type MockServiceHealthCard = {
  id: string;
  name: string;
  region: string;
  variant: StatusPillVariant;
  statusLabel: string;
  latencyLabel: string;
  spark: readonly number[];
};

export const mockSystemStatusChips: SystemStatusChip[] = [
  { id: "api", label: "Core API", variant: "ok", pillLabel: "Nominal" },
  { id: "db", label: "Data plane", variant: "ok", pillLabel: "Nominal" },
  { id: "email", label: "Transactional email", variant: "degraded", pillLabel: "Backoff" },
  { id: "ship", label: "Shipping quotes", variant: "ok", pillLabel: "Nominal" },
  { id: "jobs", label: "Async workers", variant: "neutral", pillLabel: "Maintenance window" },
];

export const mockIntegrations: MockIntegration[] = [
  {
    name: "Shippo",
    envLabel: "Production",
    status: "ok",
    statusLabel: "Synced",
    lastSyncLine: "Carrier accounts verified · webhook delivery stable",
  },
  {
    name: "Outbound email",
    envLabel: "Production",
    status: "degraded",
    statusLabel: "Retrying",
    lastSyncLine: "Provider warm-up tier · queued sends draining",
  },
  {
    name: "Analytics export",
    envLabel: "Staging",
    status: "neutral",
    statusLabel: "Paused",
    lastSyncLine: "Schedule held for schema migration",
  },
];

export const mockQueueHealthRows: MockQueueRow[] = [
  { name: "orders.checkout.completed", depth: "18", oldestAge: "54s", slaHint: "Target · under 2m ingest" },
  { name: "fulfillment.pick.release", depth: "4", oldestAge: "12s", slaHint: "Within SLO" },
  { name: "notifications.dispatch", depth: "126", oldestAge: "6m", slaHint: "Watchdog · backoff active" },
  { name: "webhooks.retry", depth: "9", oldestAge: "3m", slaHint: "DLQ threshold 25" },
];

export const mockActiveAlerts: GovernanceAlertRow[] = [
  {
    id: "al1",
    title: "Email provider rate envelope",
    detail: "Batch sends throttled for 22m. Receipts unaffected for completed orders.",
    variant: "warning",
    badge: "Degraded path",
  },
  {
    id: "al2",
    title: "Staging parity check",
    detail: "Feature flag diff vs production — informational until Friday cutover.",
    variant: "neutral",
    badge: "Advisory",
  },
];

export const mockAuditTimelineFull: AuditTimelineRow[] = [
  {
    id: "aud1",
    actor: "Jamie Kerr",
    verb: "updated",
    target: "feature flag storefront.catering_beta",
    relativeTime: "6m ago",
    severity: "warning",
    severityLabel: "Change",
  },
  {
    id: "aud2",
    actor: "sys.auth",
    verb: "enforced MFA",
    target: "group admin-console",
    relativeTime: "22m ago",
    severity: "ok",
    severityLabel: "Policy",
  },
  {
    id: "aud3",
    actor: "pipeline.deploy",
    verb: "promoted build",
    target: "v2026.05.13-0142",
    relativeTime: "1h ago",
    severity: "neutral",
    severityLabel: "Release",
  },
  {
    id: "aud4",
    actor: "R. Okonkwo",
    verb: "exported",
    target: "audit slice · governance Q1",
    relativeTime: "3h ago",
    severity: "critical",
    severityLabel: "Export",
  },
  {
    id: "aud5",
    actor: "sys.integrations",
    verb: "rotated",
    target: "Shippo webhook signing secret",
    relativeTime: "Yesterday",
    severity: "ok",
    severityLabel: "Secret",
  },
  {
    id: "aud6",
    actor: "M. Patel",
    verb: "revoked session",
    target: "admin@franchise-east",
    relativeTime: "Yesterday",
    severity: "warning",
    severityLabel: "Access",
  },
  {
    id: "aud7",
    actor: "sys.billing",
    verb: "reconciled",
    target: "invoice export job",
    relativeTime: "2d ago",
    severity: "neutral",
    severityLabel: "Job",
  },
];

export const mockRecentAdminActions: RecentAdminAction[] = [
  { id: "ra1", actor: "Jamie Kerr", action: "Adjusted ops roster · removed dormant alias", relativeTime: "41m ago" },
  { id: "ra2", actor: "R. Okonkwo", action: "Acknowledged platform alert #4481", relativeTime: "2h ago" },
  { id: "ra3", actor: "sys.automation", action: "Published maintenance advisory banner", relativeTime: "5h ago" },
  { id: "ra4", actor: "M. Patel", action: "Verified customer escalation case #88912", relativeTime: "Yesterday" },
];

export const mockSecurityHighlights: SecurityHighlightSnippet[] = [
  {
    title: "Device MFA anomalies",
    body: "Two admin consoles registered new fingerprints in the last 24h — both geo-consistent.",
  },
  {
    title: "Session horizon",
    body: "Idle timeout aligned to 45m platform policy; privileged surfaces re-auth at elevation.",
  },
];

export const mockAdminDirectory: MockAdminDirectoryRow[] = [
  {
    id: "adm1",
    name: "Jamie Kerr",
    email: "jamie.kerr@momos.cafe",
    roles: ["super_admin"],
    lastActivity: "Active now",
    status: "ok",
    statusLabel: "Healthy",
    invitationPending: false,
  },
  {
    id: "adm2",
    name: "Rita Okonkwo",
    email: "rita.okonkwo@momos.cafe",
    roles: ["admin", "fulfillment_ops"],
    lastActivity: "32m ago",
    status: "ok",
    statusLabel: "Healthy",
    invitationPending: false,
  },
  {
    id: "adm3",
    name: "Marcus Patel",
    email: "marcus.patel@momos.cafe",
    roles: ["admin"],
    lastActivity: "4h ago",
    status: "neutral",
    statusLabel: "Away",
    invitationPending: false,
  },
  {
    id: "adm4",
    name: "Invited operator",
    email: "ops-onboarding@partner.co",
    roles: [],
    lastActivity: "—",
    status: "warning",
    statusLabel: "Pending",
    invitationPending: true,
  },
];

export const mockRoleCards: MockRoleCard[] = [
  {
    id: "customer",
    title: "Customer",
    description: "Storefront diners, catering guests, rewards participants.",
    capabilities: ["Place orders and manage own profile", "View order history & invoices", "Submit catering requests"],
    routePrefixes: ["/account/*", "/ (storefront checkout)"],
    elevated: [],
  },
  {
    id: "admin",
    title: "Admin",
    description: "Staff operations consoles with location-scoped leverage.",
    capabilities: ["Fulfillment, shipping, catalog, support surfaces", "Customer lookup for service recovery", "Communications templates & queues"],
    routePrefixes: ["/admin/*"],
    elevated: ["Refunds past policy window (when enabled)", "Manual shipment overrides"],
  },
  {
    id: "super_admin",
    title: "Super admin",
    description: "Cross-tenant governance; least-populated roster.",
    capabilities: ["Identity posture & admin roster", "Platform flags and integrations", "Privileged audit exports"],
    routePrefixes: ["/super-admin/*"],
    elevated: ["Cognito-aligned resets (audited)", "Destructive toggles behind dual control (future)"],
  },
];

export const maskedCognitoEnvHints: readonly string[] = [
  "COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX",
  "COGNITO_CLIENT_ID=********************************",
  "COGNITO_ISSUER=https://cognito-idp.us-east-1.amazonaws.com/********",
];

export const mockWebhookDeliveryStats = [
  { label: "Delivered (24h)", value: "2,846" },
  { label: "Retries", value: "38" },
  { label: "Dead-letter", value: "0" },
];

export const mockOutboundEmailLanes = [
  {
    name: "Transactional SMTP",
    detail:
      mockIntegrations[1]?.lastSyncLine ?? "Burst queue shedding · receipts still within notification SLO.",
  },
  {
    name: "Lifecycle & catering",
    detail: "Drip confirmations and tasting notes share tempered throughput separate from transactional burst.",
  },
  {
    name: "Compliance archive",
    detail: "Immutable BCC journaling off the hot path — retention policy stubs until legal stack connects.",
  },
] as const;

export const mockServiceHealthCards: MockServiceHealthCard[] = [
  {
    id: "srv1",
    name: "Edge / CDN",
    region: "Global",
    variant: "ok",
    statusLabel: "Healthy",
    latencyLabel: "p95 68ms",
    spark: [32, 38, 35, 40, 36, 42, 39, 44, 41, 46, 43, 48],
  },
  {
    id: "srv2",
    name: "App router",
    region: "iad-1",
    variant: "ok",
    statusLabel: "Healthy",
    latencyLabel: "p95 118ms",
    spark: [42, 45, 48, 52, 49, 55, 51, 58, 54, 52, 56, 59],
  },
  {
    id: "srv3",
    name: "Worker fleet",
    region: "iad-1",
    variant: "degraded",
    statusLabel: "Backpressure",
    latencyLabel: "queue depth ↑",
    spark: [40, 48, 55, 62, 70, 78, 72, 65, 60, 58, 55, 52],
  },
  {
    id: "srv4",
    name: "Search / index",
    region: "replica-b",
    variant: "neutral",
    statusLabel: "Warming",
    latencyLabel: "not in path",
    spark: [20, 22, 25, 28, 30, 32, 35, 33, 31, 30, 28, 27],
  },
];
