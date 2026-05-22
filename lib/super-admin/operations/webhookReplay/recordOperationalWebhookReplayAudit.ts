import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ReplayAuditOutcome = "success" | "skipped" | "error" | "dry_run_only";

export async function recordOperationalWebhookReplayAudit(input: {
  receiptId?: string | null;
  provider: string;
  dryRun: boolean;
  confirmed: boolean;
  actorSub: string;
  actorEmail?: string | null;
  outcome: ReplayAuditOutcome | string;
  detail: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.operationalWebhookReplayAudit.create({
      data: {
        receiptId: input.receiptId?.trim() || null,
        provider: input.provider.trim(),
        dryRun: input.dryRun,
        confirmed: input.confirmed,
        actorSub: input.actorSub.trim(),
        actorEmail: input.actorEmail?.trim() || null,
        outcome: input.outcome,
        detail: input.detail as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("[operational_webhook_replay_audit] write failed", err);
  }
}
