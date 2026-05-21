-- CreateEnum
CREATE TYPE "OperationalFailureTriageState" AS ENUM ('new', 'acknowledged', 'investigating', 'resolved', 'ignored');

-- CreateTable
CREATE TABLE "operational_failure_triage" (
    "id" TEXT NOT NULL,
    "activity_event_id" TEXT NOT NULL,
    "state" "OperationalFailureTriageState" NOT NULL DEFAULT 'new',
    "assigned_to" VARCHAR(320),
    "notes" TEXT,
    "updated_by" VARCHAR(320),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operational_failure_triage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operational_failure_triage_activity_event_id_key" ON "operational_failure_triage"("activity_event_id");

-- CreateIndex
CREATE INDEX "operational_failure_triage_state_idx" ON "operational_failure_triage"("state");

-- CreateIndex
CREATE INDEX "operational_failure_triage_updated_at_idx" ON "operational_failure_triage"("updated_at" DESC);
