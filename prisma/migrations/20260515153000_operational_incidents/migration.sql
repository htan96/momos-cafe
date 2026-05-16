-- CreateTable
CREATE TABLE "operational_incidents" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "affected_systems" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "first_detected_at" TIMESTAMPTZ(6),
    "last_detected_at" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "source_event_ids" JSONB,
    "resolution_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operational_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operational_incidents_type_idx" ON "operational_incidents"("type");

-- CreateIndex
CREATE INDEX "operational_incidents_status_idx" ON "operational_incidents"("status");

-- CreateIndex
CREATE INDEX "operational_incidents_last_detected_at_idx" ON "operational_incidents"("last_detected_at" DESC);
