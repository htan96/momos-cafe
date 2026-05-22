import { OperationalSupportIssueStatus } from "@prisma/client";

export type LegalSupportTransitionResult =
  | { ok: true }
  | { ok: false; reason: string };

const ALLOWED: Record<OperationalSupportIssueStatus, ReadonlySet<OperationalSupportIssueStatus>> = {
  [OperationalSupportIssueStatus.OPEN]: new Set([
    OperationalSupportIssueStatus.REVIEWING,
    OperationalSupportIssueStatus.WAITING_CUSTOMER,
    OperationalSupportIssueStatus.ESCALATED,
    OperationalSupportIssueStatus.RESOLVED,
  ]),
  [OperationalSupportIssueStatus.REVIEWING]: new Set([
    OperationalSupportIssueStatus.WAITING_CUSTOMER,
    OperationalSupportIssueStatus.ESCALATED,
    OperationalSupportIssueStatus.RESOLVED,
    OperationalSupportIssueStatus.OPEN,
  ]),
  [OperationalSupportIssueStatus.WAITING_CUSTOMER]: new Set([
    OperationalSupportIssueStatus.REVIEWING,
    OperationalSupportIssueStatus.ESCALATED,
    OperationalSupportIssueStatus.RESOLVED,
  ]),
  [OperationalSupportIssueStatus.ESCALATED]: new Set([
    OperationalSupportIssueStatus.REVIEWING,
    OperationalSupportIssueStatus.WAITING_CUSTOMER,
    OperationalSupportIssueStatus.RESOLVED,
  ]),
  [OperationalSupportIssueStatus.RESOLVED]: new Set([
    OperationalSupportIssueStatus.OPEN,
    OperationalSupportIssueStatus.REVIEWING,
  ]),
};

/**
 * Explicit support lifecycle edges — enforced on PATCH only.
 * POST /api/ops/support/issues may still open with an arbitrary valid enum (bootstrap).
 */
export function legalSupportTransition(
  prior: OperationalSupportIssueStatus,
  next: OperationalSupportIssueStatus
): LegalSupportTransitionResult {
  if (prior === next) {
    return { ok: true };
  }
  const edges = ALLOWED[prior];
  if (!edges?.has(next)) {
    return {
      ok: false,
      reason: `illegal_support_transition:${prior}->${next}`,
    };
  }
  return { ok: true };
}
