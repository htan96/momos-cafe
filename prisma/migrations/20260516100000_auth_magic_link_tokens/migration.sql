-- Magic-link login tokens (customer auth Phase 1)

CREATE TABLE IF NOT EXISTS "auth_magic_link_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email_norm" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_magic_link_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_magic_link_tokens_token_hash_key" ON "auth_magic_link_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "auth_magic_link_tokens_email_norm_idx" ON "auth_magic_link_tokens"("email_norm");
CREATE INDEX IF NOT EXISTS "auth_magic_link_tokens_expires_at_idx" ON "auth_magic_link_tokens"("expires_at");
