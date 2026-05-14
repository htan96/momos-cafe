-- CreateTable
CREATE TABLE "governance_audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "actor_sub" TEXT NOT NULL,
    "actor_email" TEXT NOT NULL,
    "target_email" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governance_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "governance_audit_events_created_at_idx" ON "governance_audit_events"("created_at" DESC);
CREATE INDEX "governance_audit_events_type_idx" ON "governance_audit_events"("type");
