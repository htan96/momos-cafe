/**
 * Label-only registry for future email automation (no provider calls).
 * Maps workflow keys to human-readable descriptions for UI and orchestration planning.
 */
export const EMAIL_WORKFLOW_REGISTRY = {
  /** Order lifecycle, receipts, pickup ready, shipped */
  transactionalCommerce: { label: "Commerce transactional" },
  /** Catering proposal, confirmation, event reminders */
  catering: { label: "Catering lifecycle" },
  /** Password reset, email verify — owned by Cognito + app templates */
  accountSecurity: { label: "Account & security" },
  /** Marketing and lifecycle (opt-in) */
  promotional: { label: "Promotional / lifecycle" },
  /** Staff and super-admin alerts */
  internalOps: { label: "Internal operations" },
  /** Future: inbound parsing, support thread IDs, DMARC alignment */
  inboundPlaceholder: { label: "Inbound (future)" },
} as const;

export type EmailWorkflowKey = keyof typeof EMAIL_WORKFLOW_REGISTRY;
