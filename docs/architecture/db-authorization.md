# Database authorization (Cognito auth only)

## Model

- **`users`** table: `cognito_sub` (unique), `email`, `role` (`Customer` | `Admin` | `SuperAdmin`), `status` (`Active` | `Suspended` | `Disabled`), optional `customer_id`.
- Cognito JWT proves identity (`sub`, `email`); **role and status are read from Postgres** when `AUTHZ_SOURCE=db` (default).

## `AUTHZ_SOURCE`

| Value | Behavior |
| --- | --- |
| `db` | Authoritative Postgres role/status; signup does not assign Cognito groups; edge middleware JWT-only. |
| `dual` | Postgres writes + Cognito group sync on staff changes; middleware uses groups; logs role mismatches. |
| `cognito` | Legacy: groups from JWT only (Postgres optional). |

## Edge middleware

Edge cannot query Postgres. When `AUTHZ_SOURCE=db`, `cognitoGate` validates ID token (issuer + exp) only. Layouts (`assert*PlatformLayout`) and API handlers (`getCognitoServerSession`, `requireSuperStaffJson`) enforce role/status.

## Backfill

```bash
npx tsx scripts/backfill-users-from-cognito.ts
```

Requires Cognito `ListUsersInGroup` IAM and `DATABASE_URL`.

## Staff role changes

`PATCH /api/admin/accounts/staff-role` — super-admin only; writes `users.role` (and Cognito groups when `dual`/`cognito`).
