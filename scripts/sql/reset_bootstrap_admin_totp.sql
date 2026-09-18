-- Reset bootstrap super-admin TOTP enrollment only (break-glass re-enrollment).
-- Preserves: id, email_normalized row; does not touch `users` or env credentials.
-- Requires: bootstrap_admin_auth row exists for the platform owner email.
--
-- Usage (manual ops):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/reset_bootstrap_admin_totp.sql
--
-- After run: next bootstrap login returns step `totp_setup` with a new QR code.

UPDATE bootstrap_admin_auth
SET
  totp_enabled = false,
  totp_secret_encrypted = NULL,
  totp_verified_at = NULL,
  recovery_codes_hashes = NULL,
  updated_at = NOW()
WHERE id = 'default';

-- Verify (expect one row, totp disabled, no secret):
-- SELECT id, email_normalized, totp_enabled,
--        totp_secret_encrypted IS NULL AS secret_cleared,
--        totp_verified_at, recovery_codes_hashes
-- FROM bootstrap_admin_auth WHERE id = 'default';
