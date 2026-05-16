-- CreateEnum
CREATE TYPE "OperationalActivitySeverity" AS ENUM ('info', 'warning', 'error', 'critical');

-- CreateTable
CREATE TABLE "operational_activity_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "OperationalActivitySeverity" NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_name" TEXT,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "source" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operational_activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operational_activity_events_type_idx" ON "operational_activity_events"("type");

-- CreateIndex
CREATE INDEX "operational_activity_events_created_at_idx" ON "operational_activity_events"("created_at" DESC);
