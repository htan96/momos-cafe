import { prisma } from "@/lib/prisma";

export const WEBHOOK_REPLAY_REPEAT_WINDOW_DAYS = 14;
const TOP_RECEIPT_CAP = 25;
/** Treat as “repeat manual replay activity” when the same receipt appears this many times in-window. */
export const WEBHOOK_REPLAY_REPEAT_THRESHOLD = 3;

export type WebhookReplayRepeatRow = { receiptId: string; replayCount: number };

/**
 * Capped, read-only SQL rollup — no table scan beyond grouped receipt ids in the trailing window.
 */
export async function aggregateWebhookReplayRepeats(
  now: Date = new Date()
): Promise<{ windowStartedAtIso: string; topReceipts: WebhookReplayRepeatRow[] }> {
  const since = new Date(now.getTime() - WEBHOOK_REPLAY_REPEAT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<Array<{ receipt_id: string; cnt: bigint }>>`
    SELECT receipt_id::text AS receipt_id, COUNT(*)::bigint AS cnt
    FROM operational_webhook_replay_audits
    WHERE receipt_id IS NOT NULL
      AND created_at >= ${since}
    GROUP BY receipt_id
    ORDER BY cnt DESC
    LIMIT ${TOP_RECEIPT_CAP}
  `;

  return {
    windowStartedAtIso: since.toISOString(),
    topReceipts: rows.map((r) => ({ receiptId: r.receipt_id, replayCount: Number(r.cnt) })),
  };
}
