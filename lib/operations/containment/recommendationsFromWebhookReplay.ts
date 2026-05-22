import type { WebhookReplayRepeatRow } from "./aggregateWebhookReplayRepeats";
import { WEBHOOK_REPLAY_REPEAT_THRESHOLD } from "./aggregateWebhookReplayRepeats";
import type { ContainmentRecommendation } from "./types";

export function recommendationFromWebhookReplayRepeats(input: {
  windowStartedAtIso: string;
  topReceipts: WebhookReplayRepeatRow[];
}): ContainmentRecommendation | null {
  const repeaters = input.topReceipts.filter((r) => r.replayCount >= WEBHOOK_REPLAY_REPEAT_THRESHOLD);
  if (repeaters.length === 0) return null;

  const worst = repeaters[0]!;
  const sev = worst.replayCount >= 8 || repeaters.length >= 6 ? "HIGH" : "WARNING";

  return {
    kind: "webhook.receipt_repeat_replays",
    severity: sev,
    rationale: [
      `Within the replay-audit trailing window (from ${input.windowStartedAtIso}), ${repeaters.length} receipt id(s) logged ≥${WEBHOOK_REPLAY_REPEAT_THRESHOLD} super-admin replay attempts.`,
      "Repeated reconciles on the same receipt often mean upstream PSP/carrier drift or stuck local projections — investigate before further force-reconcile experiments.",
    ],
    evidenceRefs: repeaters.slice(0, 12).map((r) => `webhookReplay:receipt=${r.receiptId.slice(0, 12)}…:count=${r.replayCount}`),
    suggestedOperatorActions: [
      "Open webhook replay + receipt detail for the hottest ids; correlate with GovernanceAudit replay entries and PSP dashboards.",
      "Avoid stacking dry-runs vs confirmed reconciles without a written hypothesis per receipt.",
    ],
    relatedDashboardLinks: [
      "/super-admin/operations/webhook-replay",
      "/super-admin/operations/payment-integrity",
      "docs/runbooks/notifications-webhooks-replay-and-backlog.md",
    ],
  };
}
