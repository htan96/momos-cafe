import { prisma } from "@/lib/prisma";
import type { ContainmentRecommendation } from "./types";

const TRIAGE_WINDOW_DAYS = 7;
const ACTIVE_TRIAGE_THRESHOLD = 8;

/**
 * Thin count of non-terminal triage overlays — steers operators to the failures inbox without interpreting causes.
 */
export async function loadFailureTriagePressureRecommendation(
  now: Date = new Date()
): Promise<ContainmentRecommendation | null> {
  const since = new Date(now.getTime() - TRIAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const active = await prisma.operationalFailureTriage.count({
    where: {
      state: { in: ["new", "acknowledged", "investigating"] },
      updatedAt: { gte: since },
    },
  });

  if (active < ACTIVE_TRIAGE_THRESHOLD) return null;

  return {
    kind: "failure_triage.active_queue_pressure",
    severity: active >= 20 ? "HIGH" : "WARNING",
    rationale: [
      `${active} operational failure triage rows were touched in the last ${TRIAGE_WINDOW_DAYS}d while still non-terminal (new/acknowledged/investigating).`,
      "Indicates sustained incident load — coordinate before stacking additional reconcile or replay work.",
    ],
    evidenceRefs: [`failureTriage:activeUpdatedInWindow=${active}`],
    suggestedOperatorActions: [
      "Drain or re-bucket the failures inbox with explicit owners; avoid parallel competing reconciliations on the same commerce orders.",
    ],
    relatedDashboardLinks: ["/super-admin/operations/failures", "docs/runbooks/notifications-webhooks-replay-and-backlog.md"],
  };
}
