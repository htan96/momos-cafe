# Operational authority boundaries

This document maps **who can invoke** operational HTTP surfaces, which **auth primitives** enforce that, and whether **audit trails** exist. It is a snapshot for reviewers; it is not an RBAC design spec.

**Auth primitives (short)**

| Mechanism | Meaning |
|-----------|---------|
| **`requireSuperStaffJson()`** | JWT + optional verified impersonation → `delegatedStaffAuthorityGroups`; must include Cognito group **`super_admin`**. Returns `403 { error, code: "FORBIDDEN" }`. |
| **`resolveSuperStaffDelegation()` + `isSuperAdmin(authorityGroups)`** | Same underlying authority as `requireSuperStaffJson`, expressed inline; often paired with `governanceAuditActorForSuperStaff`. |
| **`getOpsSession()` + `opsCan(role, perm)`** | ID token cookie: any Cognito **`admin`** or **`super_admin`** group. **`role` passed to `opsCan` is always `"admin"`** (see `lib/ops/getOpsSession.ts`); real badge is `roleBadge`. |
| **`verifyInternalSecretFromRequest` / middleware `INTERNAL_API_SECRET`** | Server-to-server orchestration (Bearer or `x-momos-internal-secret`-style header per `lib/server/internalAuth.ts` / `middleware.ts`). |
| **Customer session / guest header** | Storefront Cognito customer or `x-momos-guest-cart-token` on scoped order routes (see `lib/server/commerceOrderApiAuth.ts`). |

**Middleware caveat**

`middleware.ts` **`config.matcher`** includes `/api/ops/*`, `/ops/*`, and page prefixes like `/super-admin/*`, but **does not** include `/api/super-admin/*`. Routes under **`/api/super-admin/...`** rely on **handler-level** guards only (no Cognito middleware envelope for that path pattern).

---

## `app/api/super-admin/operations/**`

| Route group | File path | Auth mechanism | Sensitive? | Audit today? | Recommendation |
|-------------|-----------|----------------|-----------|--------------|----------------|
| Operational failures list | `app/api/super-admin/operations/failures/route.ts` | `requireSuperStaffJson` (GET) | Read (failure index) | No dedicated row; read-only | Keep |
| Operational failure detail | `app/api/super-admin/operations/failures/[eventId]/route.ts` | `requireSuperStaffJson` (GET) | Read | No | Keep |
| Failure triage mutation | `app/api/super-admin/operations/failures/[eventId]/triage/route.ts` | `requireSuperStaffJson` + delegation + `isSuperAdmin` + `jwtUser` (PATCH) | **Yes** (triage state) | `GovernanceAuditEvent` `OPERATIONAL_FAILURE_TRIAGE_UPDATED` + platform event | Keep |
| Webhook receipts list | `app/api/super-admin/operations/webhook-receipts/route.ts` | `requireSuperStaffJson` (GET) | Read (PII-adjacent linkage) | No | Keep |
| Webhook receipt drill-in | `app/api/super-admin/operations/webhook-receipts/[id]/route.ts` | `requireSuperStaffJson` (GET) | Read | No | Keep |
| **Webhook receipt replay** | `app/api/super-admin/operations/webhook-receipts/[id]/replay/route.ts` | `requireSuperStaffJson` + explicit `isSuperAdmin` + `jwtUser` (POST) | **Yes** (reconcile / payments / shipping side effects) | `OperationalWebhookReplayAudit` + `GovernanceAuditEvent` (`OPERATIONS_WEBHOOK_RECEIPT_REPLAY`, `OPERATIONS_WEBHOOK_RECEIPT_REPLAY_FORCE` when `forceReconcile`) | **Keep** — already **super_admin-only** (not ops session). `forceReconcile` UI + governance audit sufficient; optional future: body `dangerConfirmForceReconcile` if third-party clients appear. |
| **Notification operator requeue** | `app/api/super-admin/operations/notification-events/[id]/operator-requeue/route.ts` | Same as replay (POST) | **Yes** (lease / dead-letter rewind) | `GovernanceAuditEvent` `OPERATIONS_NOTIFICATION_EVENT_OPERATOR_REQUEUE` | **Keep** — Phase B requires `dangerConfirmResetDeadLetter`; super_admin-only. |
| Operational identity visibility | `app/api/super-admin/operations/operational-identity/search/route.ts`, `.../[id]/route.ts` | `requireSuperStaffJson` (GET); POST: delegation + explicit `isSuperAdmin` | Read / **group mutation when Cognito env present** | `GovernanceAuditEvent` `OPERATIONS_IDENTITY_ROLE_MEMBERSHIP_CHANGE` + failure phases | Keep — granular pool group deltas only; ladder moves stay on **`/api/admin/accounts/staff-role`**. |
| Square payment lookup recovery | `app/api/super-admin/operations/recovery/square-payment-lookup/route.ts` | Delegation + `isSuperAdmin` (POST) | **Yes** | `GovernanceAuditEvent` + platform events | Keep; inline guard matches `requireSuperStaffJson` semantics |
| Shippo label recovery | `app/api/super-admin/operations/recovery/shippo-label/route.ts` | Delegation + `isSuperAdmin` (POST/PATCH) | **Yes** | `GovernanceAuditEvent` | Keep |
| Catalog sync recovery | `app/api/super-admin/operations/recovery/catalog-sync/route.ts` | Delegation + `isSuperAdmin` (GET/POST) | **Yes** (menu/cache) | `GovernanceAuditEvent` + operational events | Keep |

---

## `app/api/ops/**` (Cognito middleware + cookie session)

| Route group | File path | Auth mechanism | Sensitive? | Audit today? | Recommendation |
|-------------|-----------|----------------|-----------|--------------|----------------|
| Refund cases | `app/api/ops/refunds/cases/route.ts`, `cases/[id]/route.ts` | `getOpsSession` + `opsCan(..., "support:write")` | **Yes** | `GovernanceAuditEntry` / platform events in handlers | Keep — note **effective `opsCan` role is always `admin`**; `roleBadge` used for actor typing where present |
| Fulfillment transition | `app/api/ops/fulfillment/[groupId]/transition/route.ts` | `getOpsSession` + `opsCan(..., "fulfillment:write")` | **Yes** | Platform `emitPlatformEvent` | Keep |
| Shipping purchase label | `app/api/ops/shipping/purchase-label/route.ts` | `getOpsSession` + `opsCan(..., "shipping:write")` | **Yes** | Platform events (via `runShippoLabelPurchaseForShipment`) | Keep |
| Shipping manual row | `app/api/ops/shipping/manual/route.ts` | `getOpsSession` + `opsCan(..., "shipping:write")` | **Yes** | Not traced here | Keep; consider governance audit if compliance requires |
| Communications timeline | `app/api/ops/communications/timeline/route.ts` | `getOpsSession` + `opsCan(..., "console:read")` | Read | No | Keep |
| Communications notes | `app/api/ops/communications/notes/route.ts` | `getOpsSession` + `canAuthorNote` (`communications:write` **or** `support:write`) | **Yes** | `GovernanceAuditEntry` + platform events | Keep |
| Support issues | `app/api/ops/support/issues/route.ts`, `issues/[id]/route.ts` | `getOpsSession` + `opsCan(..., "support:write")` | Varies | Handler-dependent | Keep |

**`lib/ops/permissions.ts`**

- The **`ROLE_MATRIX`** is defined for multiple `OpsRole` values (`admin`, `fulfillment`, `catering`, `support`, `read_only`).
- **`getOpsSession()` always sets `role: "admin"`** for every Cognito staff user who passes the gate (both `admin` and `super_admin` groups). Therefore **`opsCan(session.role, …)` always evaluates the `admin` row** until multi-role ops is implemented.
- Use **`session.roleBadge === 'super_admin'`** in handlers when actor attribution or future tightening must distinguish super admins (e.g. refund PATCH).

---

## Super-admin governance (non-operations path)

| Route group | File path | Auth mechanism | Sensitive? | Audit today? | Recommendation |
|-------------|-----------|----------------|-----------|--------------|----------------|
| Governance controls | `app/api/super-admin/governance-controls/route.ts` | `requireSuperStaffJson` (GET); PATCH: `requireSuperStaffJson` + delegation + `isSuperAdmin` + `jwtUser` | **Yes** | `GovernanceAuditEvent` per key + operational event | **Keep** — super_admin-only mutation; documented |

---

## Impersonation (delegated authority)

| Surface | File path | Auth / notes |
|---------|-----------|----------------|
| Start impersonation | `app/api/super-admin/impersonation/start/route.ts` | Cognito server session must be **`super_admin`**. Signs HttpOnly `IMPERSONATION_COOKIE`; ledger row in DB. Customer scope only (admin scope deferred). |
| End impersonation | `app/api/super-admin/impersonation/end/route.ts` | Verified token + ledger update |
| Status | `app/api/super-admin/impersonation/status/route.ts` | Token verification + ledger read |
| Authority injection | `lib/auth/cognito/staffDelegatedAuthority.ts`, `lib/auth/cognito/requireSuperStaff.ts` | Verified impersonation binds JWT subject to actor; **`delegatedStaffAuthorityGroups`** supplies `actorStaffGroups` for `super_admin` checks while UI may show diner JWT. |

**Operational impact:** `requireSuperStaffJson()` and replay/requeue handlers use **`delegatedStaffAuthorityGroups`**, so a **super_admin actor** performing **customer impersonation** still passes **super_admin** gates; audits should use **`governanceAuditActorForSuperStaff`** (actor = staff, not subject).

---

## `INTERNAL_API_SECRET` and related internal routes

**Middleware:** For paths included in `middleware.ts` `matcher`, non–Cognito-protected `/api/*` requests hit **`internalGate`** (Bearer / header must match secret). Many routes also call **`verifyInternalSecretFromRequest`** for parity.

| Area | Example path | Mechanism |
|------|----------------|-----------|
| Cron / jobs | `app/api/internal/cron/integration-health/route.ts`, `notification-outbox/route.ts` | Handler `verifyInternalSecretFromRequest` |
| Email ops | `app/api/internal/email/ses-smoke-send/route.ts`, `app/api/internal/webhooks/ses-notification/route.ts` | Matched in middleware + handler check |
| Square catalog | `app/api/square/catalog/sync/route.ts`, `discovery/route.ts` | Middleware matcher + throttles / handler |
| Order pipeline | `app/api/orders/route.ts` (internal branches), `lib/server/commerceOrderApiAuth.ts` | Internal secret **or** ops session **or** customer **or** guest token (per helper) |
| Inbound forwarder | `app/api/email/inbound-ses/route.ts` | SNS verification path + optional Bearer internal secret branch |

**Recommendation:** Treat **`INTERNAL_API_SECRET`** rotation as operational procedure; do not expose from browser UIs (already noted on ops settings page).

---

## Related customer / order APIs (not under `ops/`)

`lib/server/commerceOrderApiAuth.ts` centralizes **order read** and **order mutation** subjects: internal secret, ops (`console:read` / `orders:write` / `fulfillment:write` via `getOpsSession`), customer ownership, or guest cart token.

---

---

## Related: commerce lifecycle truth vs HTTP authority

Operational HTTP boundaries (this document) are orthogonal to **which subsystem owns storefront commerce lifecycle truth** — PSP settlements, fulfillment groups, shipments, notification outbacks, replay overlays, and derived order rollups. For that mapping, see [**Commerce lifecycle authority**](./commerce-lifecycle-authority.md), which aligns with **`lib/commerce/lifecycleAuthority/`** helpers used for explainability-only overlays (for example lifecycle integrity dashboards).

---

## Change log (hardening pass)

- Documented **`getOpsSession` / `opsCan` coarse matrix** behavior and middleware gap for **`/api/super-admin`**.
- Added **`requireSuperStaffJson()`** at the start of **`governance-controls` PATCH** and **failure triage PATCH** so super-staff gates follow one obvious entrypoint alongside existing delegation checks.
