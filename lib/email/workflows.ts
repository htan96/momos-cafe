import type { WorkflowId } from "@/domains/communications/workflowIds";

/**
 * Label-only registry for future email automation (no provider calls).
 * Keys are aligned with WorkflowId (@/domains/communications/workflowIds).
 */
export const EMAIL_WORKFLOW_REGISTRY: Record<
  WorkflowId,
  Readonly<{ label: string }>
> = {
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
