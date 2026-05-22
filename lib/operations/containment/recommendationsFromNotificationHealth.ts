import type { NotificationOperationalHealthSnapshot } from "@/lib/super-admin/notifications/loadNotificationOperationalHealth";
import type { ContainmentRecommendation } from "./types";

const DEAD_LETTER_HIGH = 10;
const REQUEUE_CHURN_THRESHOLD = 12;

/**
 * Uses **already-aggregated** notification health metrics (no extra table walks).
 */
export function recommendationsFromNotificationHealth(
  snapshot: NotificationOperationalHealthSnapshot
): ContainmentRecommendation[] {
  const out: ContainmentRecommendation[] = [];
  const { reliability, backlog } = snapshot;

  if (reliability.deadLetterAttemptCapRows > 0) {
    const sev = reliability.deadLetterAttemptCapRows >= DEAD_LETTER_HIGH ? "HIGH" : "WARNING";
    out.push({
      kind: "notifications.dead_letter_attempt_cap",
      severity: sev,
      rationale: [
        `${reliability.deadLetterAttemptCapRows} notification_events row(s) in the measured window ended with attempt_cap (exhausted retries / dead-letter style terminal).`,
        "Correlate with notifications-health terminal buckets and outbound email failures before bulk requeues.",
      ],
      evidenceRefs: [
        `notificationHealth:deadLetterAttemptCapRows=${reliability.deadLetterAttemptCapRows}`,
        `notificationHealth:processedLast24h=${reliability.processedLast24h}`,
      ],
      suggestedOperatorActions: [
        "Inspect top terminal error buckets and sample payloads; use governance-guarded operator requeue only with an explicit hypothesis.",
      ],
      relatedDashboardLinks: [
        "/super-admin/operations/notifications-health",
        "docs/runbooks/notifications-webhooks-replay-and-backlog.md",
        "docs/runbooks/governance-readiness-and-ses.md",
      ],
    });
  }

  if (reliability.governanceTouches.operatorNotificationRequeuesLast24h >= REQUEUE_CHURN_THRESHOLD) {
    out.push({
      kind: "notifications.operator_requeue_churn",
      severity: "WARNING",
      rationale: [
        `${reliability.governanceTouches.operatorNotificationRequeuesLast24h} operator notification requeue governance events in the last 24h.`,
        "High churn may indicate flapping dependencies or repeated manual rewinds without root-cause closure.",
      ],
      evidenceRefs: [
        `notificationHealth:operatorRequeues24h=${reliability.governanceTouches.operatorNotificationRequeuesLast24h}`,
        `notificationHealth:backlogOver24h=${backlog.pendingOverTwentyFourHours}`,
      ],
      suggestedOperatorActions: [
        "Pause broad rewinds; pick a small cohort, fix upstream error class, then requeue with measured batch size.",
      ],
      relatedDashboardLinks: ["/super-admin/operations/notifications-health"],
    });
  }

  return out;
}
