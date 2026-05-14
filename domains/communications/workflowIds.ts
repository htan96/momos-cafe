/** Canonical identifiers for transactional + lifecycle email buckets (see lib/email/workflows). */
export const WORKFLOW_IDS = [
  "transactionalCommerce",
  "catering",
  "accountSecurity",
  "promotional",
  "internalOps",
  "inboundPlaceholder",
] as const;

export type WorkflowId = (typeof WORKFLOW_IDS)[number];
