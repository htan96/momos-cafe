-- CreateTable
CREATE TABLE "impersonation_support_sessions" (
    "id" TEXT NOT NULL,
    "session_public_id" TEXT NOT NULL,
    "actor_sub" TEXT NOT NULL,
    "actor_email" VARCHAR(320) NOT NULL,
    "target_sub" VARCHAR(128),
    "target_email" VARCHAR(320) NOT NULL,
    "scope" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),

    CONSTRAINT "impersonation_support_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "impersonation_support_sessions_session_public_id_key" ON "impersonation_support_sessions"("session_public_id");

-- CreateIndex
CREATE INDEX "impersonation_support_sessions_actor_ended_idx" ON "impersonation_support_sessions"("actor_sub", "ended_at");

-- CreateIndex
CREATE INDEX "impersonation_support_sessions_started_at_idx" ON "impersonation_support_sessions"("started_at" DESC);
