-- CreateTable
CREATE TABLE "platform_presence_sessions" (
    "id" TEXT NOT NULL,
    "session_public_id" TEXT NOT NULL,
    "cognito_sub" TEXT,
    "user_type" TEXT NOT NULL,
    "user_role" TEXT,
    "display_name" VARCHAR(320),
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_route" VARCHAR(512),
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_impersonated" BOOLEAN NOT NULL DEFAULT false,
    "impersonator_sub" TEXT,
    "terminated_at" TIMESTAMPTZ(6),

    CONSTRAINT "platform_presence_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_presence_sessions_session_public_id_key" ON "platform_presence_sessions"("session_public_id");

-- CreateIndex
CREATE INDEX "platform_presence_sessions_cognito_sub_idx" ON "platform_presence_sessions"("cognito_sub");

-- CreateIndex
CREATE INDEX "platform_presence_sessions_last_activity_at_idx" ON "platform_presence_sessions"("last_activity_at" DESC);
