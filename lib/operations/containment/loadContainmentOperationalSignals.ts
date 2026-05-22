import "server-only";

import { WEBHOOK_REPLAY_REPEAT_WINDOW_DAYS, aggregateWebhookReplayRepeats } from "./aggregateWebhookReplayRepeats";
import { buildContainmentEscalationSummary } from "./severity";
import { loadFailureTriagePressureRecommendation } from "./recommendationsFromFailureTriage";
import { recommendationFromWebhookReplayRepeats } from "./recommendationsFromWebhookReplay";
import { recommendationsFromLifecycleIntegrityFindings } from "./recommendationsFromLifecycleIntegrity";
import { recommendationsFromNotificationHealth } from "./recommendationsFromNotificationHealth";
import type { ContainmentRecommendation } from "./types";
import type { LifecycleIntegrityReport } from "@/lib/super-admin/lifecycleIntegrity/loadLifecycleIntegrityReport";
import { loadLifecycleIntegrityReport } from "@/lib/super-admin/lifecycleIntegrity/loadLifecycleIntegrityReport";
import { loadNotificationOperationalHealth } from "@/lib/super-admin/notifications/loadNotificationOperationalHealth";

export type ContainmentOperationalPayload = {
  generatedAt: string;
  escalation: ContainmentRecommendation[];
  meta: {
    lifecycleFindingsConsidered: number;
    webhookReplayWindowDays: number;
  };
};

export type LoadContainmentOperationalSignalsOpts = {
  now?: Date;
  /** Skips redundant `loadLifecycleIntegrityReport()` when callers already hold scan results (e.g. safety page pairing). */
  lifecycleReport?: LifecycleIntegrityReport;
};

export async function loadContainmentOperationalSignals(
  opts: LoadContainmentOperationalSignalsOpts = {}
): Promise<ContainmentOperationalPayload> {
  const now = opts.now ?? new Date();
  const lifecyclePromise =
    opts.lifecycleReport !== undefined ? Promise.resolve(opts.lifecycleReport) : loadLifecycleIntegrityReport();

  const [lifecycleAwaited, notifHealth, replayAgg, triageReco] = await Promise.all([
    lifecyclePromise,
    loadNotificationOperationalHealth(now),
    aggregateWebhookReplayRepeats(now),
    loadFailureTriagePressureRecommendation(now),
  ]);

  const replayReco = recommendationFromWebhookReplayRepeats(replayAgg);
  const reco: ContainmentRecommendation[] = [
    ...recommendationsFromLifecycleIntegrityFindings(lifecycleAwaited.findings),
    ...recommendationsFromNotificationHealth(notifHealth),
    ...(triageReco ? [triageReco] : []),
    ...(replayReco ? [replayReco] : []),
  ];

  return {
    generatedAt: now.toISOString(),
    escalation: buildContainmentEscalationSummary(reco),
    meta: {
      lifecycleFindingsConsidered: lifecycleAwaited.findings.length,
      webhookReplayWindowDays: WEBHOOK_REPLAY_REPEAT_WINDOW_DAYS,
    },
  };
}
