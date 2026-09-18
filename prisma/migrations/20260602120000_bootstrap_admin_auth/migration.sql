-- Bootstrap super-admin TOTP + recovery storage
CREATE TABLE IF NOT EXISTS "bootstrap_admin_auth" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "email_normalized" TEXT NOT NULL,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "totp_secret_encrypted" TEXT,
    "totp_verified_at" TIMESTAMPTZ(6),
    "recovery_codes_hashes" JSONB,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bootstrap_admin_auth_pkey" PRIMARY KEY ("id")
);
