# Bootstrap super-admin TOTP reset

Break-glass procedure to **re-enroll** the platform bootstrap super-admin authenticator without disabling MFA or touching Cognito/`users`.

## What changes

| Cleared (`bootstrap_admin_auth`) | Preserved |
|----------------------------------|-----------|
| `totp_enabled` → `false` | Row `id` / `email_normalized` |
| `totp_secret_encrypted` → `NULL` | `users` SuperAdmin row |
| `totp_verified_at` → `NULL` | `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` env |
| `recovery_codes_hashes` → `NULL` | `BOOTSTRAP_ADMIN_TOTP_REQUIRED` (must **not** be `0`) |

There is **no UI reset** (security audit requirement). Use the operator script or SQL below.

## Operator script (preferred)

From `/var/www/htworks/momos`:

```bash
set -a && . ./.env && set +a
npx tsx scripts/reset-bootstrap-admin-totp.ts --confirm
```

- Requires `--confirm`.
- Aborts if `BOOTSTRAP_ADMIN_TOTP_REQUIRED=0`.
- Logs field-level before/after (no secrets).
- Emits `bootstrap.totp_reset` (`BOOTSTRAP_TOTP_RESET`) to operational events.

## Manual SQL

```bash
set -a && . ./.env && set +a
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/reset_bootstrap_admin_totp.sql
```

Then emit the operational event manually if your runbook requires parity with the script audit trail.

## Verification

### 1. Database row

```sql
SELECT id, email_normalized, totp_enabled,
       totp_secret_encrypted IS NULL AS secret_cleared,
       totp_verified_at, recovery_codes_hashes
FROM bootstrap_admin_auth
WHERE id = 'default';
```

Expect: `totp_enabled = false`, `secret_cleared = true`, `totp_verified_at` and `recovery_codes_hashes` null.

### 2. MFA still enforced

Confirm `.env` does **not** set `BOOTSTRAP_ADMIN_TOTP_REQUIRED=0`. Bootstrap login remains gated on TOTP after password success.

### 3. Bootstrap login API

```bash
set -a && . ./.env && set +a
curl -sS -X POST http://127.0.0.1:3000/api/auth/bootstrap/login \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$BOOTSTRAP_ADMIN_EMAIL\",\"password\":\"$BOOTSTRAP_ADMIN_PASSWORD\"}" \
  | jq '{ step, hasQr: (.qrDataUrl != null), recoveryCount: (.recoveryCodes | length?) }'
```

Expect JSON with `"step": "totp_setup"` and a non-null `qrDataUrl`.

**Do not** complete enrollment with a fake TOTP code in automation. An operator must scan the QR in a real authenticator app and finish via `/login` (setup → verify) or call `/api/auth/bootstrap/totp/setup` then `/api/auth/bootstrap/totp/verify` with a valid code.

### 4. Build (when TypeScript changed)

```bash
npm run build
```

Script-only changes do not require `pm2 reload` unless application code was rebuilt.

## Post-reset login flow

1. Open `/login`, enter bootstrap email + password.
2. UI shows QR + one-time recovery codes (`totp_setup`).
3. Scan QR, save recovery codes, submit first 6-digit TOTP.
4. Subsequent logins use `totp_verify` until recovery is needed.
