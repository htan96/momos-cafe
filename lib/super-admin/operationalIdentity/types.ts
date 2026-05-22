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

export type OperationalIdentityCandidate = {
  kind: "customer" | "cognito_profile";
  id: string;
  email: string | null;
  cognitoSub: string | null;
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
