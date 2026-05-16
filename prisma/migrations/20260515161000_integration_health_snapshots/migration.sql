-- CreateTable
CREATE TABLE "integration_health_snapshots" (
    "id" TEXT NOT NULL,
    "system_key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "current_status" TEXT NOT NULL,
    "latency_ms" INTEGER,
    "failure_rate" DOUBLE PRECISION,
    "last_successful_check_at" TIMESTAMPTZ(6),
    "last_failed_check_at" TIMESTAMPTZ(6),
    "last_error_message" VARCHAR(500),
    "metadata" JSONB,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "integration_health_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_health_snapshots_system_key_key" ON "integration_health_snapshots"("system_key");
