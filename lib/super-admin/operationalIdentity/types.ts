export type OperationalIdentityCounts = {
  orders: number;
  payments: number;
  shipments: number;
  notificationEventsApprox: number | null;
  notificationsNote: string | null;
};

export type OperationalIdentityDeepLinks = {
  /** Super-admin customer dossier — may 404 until linked. */
  customerDossier: string | null;
  orderOperationsHref: string;
  paymentIntegrityHref: string;
};

/** How the candidate ties together prisma vs pool directory. */
export type OperationalIdentityLinkage = "linked_customer" | "cognito_only" | "customer_no_pool_link";

export type OperationalIdentityCandidate = {
  cognitoConfigured: boolean;
  linkage: OperationalIdentityLinkage;
  /** `customer`: prisma diner row · **`cognito_profile`** — pool hit without prisma row (or withheld duplicate). */
  kind: "customer" | "cognito_profile";
  id: string;
  email: string | null;
  cognitoSub: string | null;
  cognitoUsername: string | null;
  preferredUsername: string | null;
  enabled: boolean | null;
  groups: string[];
  phone: string | null;
  subtitle: string;
};

/** Serializable timeline row from `queryCustomerOperationalTimeline`. */
export type OperationalIdentityTimelineItemJson = {
  id: string;
  kind: "operational_activity" | "governance_audit";
  at: string;
  lane: string;
  severity: string;
  headline: string;
  detail: string | null;
  rawType: string | null;
};
