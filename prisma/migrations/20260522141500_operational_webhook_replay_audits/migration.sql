-- OperationalWebhookReplayAudit — super-admin webhook replay tooling (append-only operational log).

CREATE TABLE "operational_webhook_replay_audits" (
    "id" TEXT NOT NULL,
    "receipt_id" TEXT,
    "provider" TEXT NOT NULL,
    "dry_run" BOOLEAN NOT NULL,
    "confirmed" BOOLEAN NOT NULL,
    "actor_sub" TEXT NOT NULL,
    "actor_email" TEXT,
    "outcome" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operational_webhook_replay_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operational_webhook_replay_audits_receipt_idx" ON "operational_webhook_replay_audits"("receipt_id");

CREATE INDEX "operational_webhook_replay_audits_created_idx" ON "operational_webhook_replay_audits"("created_at" DESC);

ALTER TABLE "operational_webhook_replay_audits" ADD CONSTRAINT "operational_webhook_replay_audits_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "webhook_delivery_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
