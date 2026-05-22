# Production readiness — implementation plan (2026-05)

**Purpose:** Actionable remediation derived from [`production-readiness-post-ops-audit-2026-05.md`](./production-readiness-post-ops-audit-2026-05.md).

**Filled execution guide (ticket-ready snippets, env matrix, QA):** [production-readiness-remediation-filled-2026-05.md](./production-readiness-remediation-filled-2026-05.md).

This document is for **engineering + QA** execution; it does not replace the audit narrative.

**Role model:** Staff use **`/admin`** + **`/api/ops/*`**. Super Admin uses **`/super-admin`** + **`/api/super-admin/*`** for governance and **audited** overrides (e.g. Shippo label recovery with `skipFulfillmentApprovalCheck`). Payment rail in this repo is **Square** (not Stripe).

---

## 1. Gap register → remediation (prioritized)

Each row: **priority**, **gap**, **remediation**, **owner hints** (paths / artifacts).

### 1.1 Cross-cutting / platform

| Priority | Gap | Remediation |
|----------|-----|--------------|
| **P0** | **ESLint** `react-hooks/set-state-in-effect` (3 errors) — blocks clean CI gates | Refactor **`app/admin/settings/maintenance/page.tsx`** (~L44), **`components/governance/ImpersonationBanner.tsx`** (~L103), **`components/governance/StartCustomerImpersonation.tsx`** (~L23) per rule of hooks (derive state / `useLayoutEffect` with documented exception / split effects). Re-run `npx eslint` on `app/admin`, `components/governance`, `components/operations`, `components/platform`. |
| **P0** | **`fulfillment_approved_*` migration not verified in prod** | In deploy/runbook: ensure **`20260522183000_fulfillment_group_shippo_approval_gate`** ran via **`prisma migrate deploy`** (or equivalent). Add one-time SQL health check listing columns on `fulfillment_groups`. Rollback posture: additive columns only — low risk. |
| **P1** | **Duplicate `app/ops/(console)` tree** while **`next.config.ts`** redirects **`/ops/*` → `/admin/*`** | **Delete** obsolete **`app/ops`** pages/layouts once QA signs off (**§5**). Update any internal `Link`/`href` still pointing at `/ops`. Keep **`/api/ops`** until a deliberate Phase 2 API rename (**optional** — see audit). Document removal in [`ops-to-admin-console-migration.md`](./ops-to-admin-console-migration.md). |
| **P1** | **`/api/super-admin/*` outside Cognito middleware matcher** | **Decision:** (A) Accept handler-only guards — refresh [`operational-authority-boundaries.md`](./operational-authority-boundaries.md) threat model + pen-test checklist, or (B) add **narrow** middleware matcher subset for **`/api/super-admin`** that mirrors handler expectations (coordinate to avoid cookie/session breakage). |
| **P2** | **Event taxonomy drift** (`shipment.label_created` ops vs **`shipment.label_purchased`** in `domains/shipping/events.ts` vs **`shipment.label.failed`** platform) | Pick **canonical names** doc + optional **alias emit** layer (dual-write for one release) OR update consumers (**`OperationalFailuresInbox`**, dashboards) to documented map. Avoid silent renames without consumer updates. |
| **P2** | **`prisma validate` fails in CI when `DATABASE_URL` unset** | CI: inject dummy Postgres URL (**`postgresql://postgres:postgres@localhost:5432/ci_schema_check`**) for schema-only validation **or** use `prisma format` + `tsc` only and document exception. |
| **P2** | **Best-effort `emitOperationalEvent`** — completeness not guaranteed under load/errors | Operational: verify **`OperationalActivityEvent`** (or successor) ingestion in staging; consider dead-letter/alerts on repeated `emitOperationalEvent` failures in [`lib/operations/emitOperationalEvent.ts`](../../lib/operations/emitOperationalEvent.ts) (additive logging only unless product asks). |
| **P3** | **`SHIPPO_REQUIRE_FULFILLMENT_APPROVAL` rollout comms** | When enabling **`true`** in prod: announce to staff (**Confirm Fulfillment** before purchase), verify super-admin recovery path + audit rows. Cross-link **`readiness`** / runbooks ([`docs/runbooks/`](../runbooks/README.md)). |

### 1.2 Customer-facing (from audit §1)

| Priority | Gap | Remediation |
|----------|-----|--------------|
| **P1** | **PSP end-to-end not statically proven** | Staging QA: Square sandbox → **`POST /api/webhooks/square`** with valid signature keys; storefront **`/checkout`** paid path → order **`paid`**; reconcile orphan tooling not triggered incorrectly. Document **`SQUARE_WEBHOOK_SIGNATURE_KEY`** + URL byte alignment. |
| **P2** | **Telemetry completeness for commerce lifecycle** | Inventory `emitOperationalEvent` / platform events on order create → paid → fulfillment; add missing hooks only where product requires analytics parity (minimal diff). |

### 1.3 Admin / OPS (from audit §2, §10.2)

| Priority | Gap | Remediation |
|----------|-----|--------------|
| **P0** (when gate on) | **Approve → purchase** workflow | Regression: **`PATCH /api/ops/fulfillment/[groupId]/transition`** with **`action: "confirm_fulfillment"`** sets **`fulfillmentApprovedAt`**; then **`POST /api/ops/shipping/purchase-label`** succeeds iff **`SHIPPO_REQUIRE_FULFILLMENT_APPROVAL`** allows. UI: **`OpsPurchaseShippoLabelButton`** respects approval flag. |
| **P2** | **Staff API naming (`/api/ops`) vs browser (`/admin`)** | Documentation only unless product mandates rename; all new **`fetch`** from admin shell must stay **`credentials: "include"`** and correct CSRF/session assumptions. |

### 1.4 Super Admin (from audit §3)

| Priority | Gap | Remediation |
|----------|-----|--------------|
| **P1** | **Handler-only API auth** | Per-row audit in release checklist: **`requireSuperStaffJson`** / **`isSuperAdmin`** on every **`app/api/super-admin/**/route.ts`** mutation. Spot-check recovery routes (**`recovery/shippo-label`**) governance audit payload. |

---

## 2. Production environment variable reference

**Legend:** **R** = required for stated environment, **O** = optional, **D** = has safe default / feature-flag semantics in code comments.

_Variable names match [`.env.example`](../../.env.example). Use platform secret managers in prod; never `NEXT_PUBLIC_*` for secrets._

### 2.1 Core & orchestration

| Variable | Req | Purpose |
|-----------|-----|---------|
| `DATABASE_URL` | **R** | Postgres connection; Prisma. CI schema validation needs dummy URL if `validate` is used. |
| `NEXT_PUBLIC_SITE_URL` | **R** | Public site origin for links/canonical behaviors (public). |
| `INTERNAL_API_SECRET` | **R** (prod) | Internal/cron orchestration gates per middleware — length/rotation ops runbook. |

### 2.2 Cognito, session, impersonation

| Variable | Req | Purpose |
|-----------|-----|---------|
| `COGNITO_REGION` | **R** | User pool region. |
| `COGNITO_USER_POOL_ID` | **R** | Pool id. |
| `COGNITO_CLIENT_ID` | **R** | App client id. |
| `COGNITO_CLIENT_SECRET` | **O** | Confidential client only. |
| `COGNITO_IDP_ADMIN_ACCESS_KEY_ID` / `COGNITO_IDP_ADMIN_SECRET_ACCESS_KEY` | **O** (**R** on Vercel/serverless without IAM role) | Admin IdP APIs (ListUsers, groups) — ops identity tooling. |
| `COGNITO_*` OAuth / Hosted UI | **O** | As needed for flows. |
| `COGNITO_PROTECTED_PREFIXES` | **O** | Middleware path list; defaults in `.env.example`. |
| `COGNITO_MFA_OPTIONAL`, `COGNITO_TEMP_DISABLE_USER_MFA_BEFORE_LOGIN` | **O/D** | MFA posture — documented tradeoffs in example. |
| `IMPERSONATION_SECRET` | **R** (prod) | HMAC impersonation cookie; **never** disable unsafe dev flag in prod. |
| `IMPERSONATION_ALLOW_UNSAFE_DEV` | **O/D** | `false` in prod (must). |

### 2.3 AWS (SES email + shared credential hints)

| Variable | Req | Purpose |
|-----------|-----|---------|
| `AWS_REGION` (or `AWS_DEFAULT_REGION`) | **R**/O | SES/SDK region resolution. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | **O/R** | Static keys OR rely on IAM role (**ECS/Lambda**) + container env. |
| `AWS_SESSION_TOKEN` | **O** | STS/session creds when using temporary keys. |
| `SES_FROM_EMAIL`, `SES_INBOUND_*`, SNS ARNs | **R**/O per feature | Transactional mail + inbound threading per docs in example. |

### 2.4 Square payments

| Variable | Req | Purpose |
|-----------|-----|---------|
| `SQUARE_ENVIRONMENT` | **R** | `production` \| `sandbox`. |
| `SQUARE_ACCESS_TOKEN` | **R** | Server token. |
| `SQUARE_LOCATION_ID` | **R** | Location context for orders/catalog. |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | **R** (live webhooks) | Per subscription — not app secret. |
| `SQUARE_WEBHOOK_NOTIFICATION_URL` | **R** | Must match console subscription URL exactly (example placeholder in file). |

> **Stripe:** Not used in this repo; do not provision `STRIPE_*` expecting code paths here.

### 2.5 Shippo & fulfillment gating

| Variable | Req | Purpose |
|-----------|-----|---------|
| `SHIPPO_API_KEY` | **R** | API token. |
| `SHIPPO_ENV` | **O/D** | e.g. `production` alignment with client. |
| `SHIPPO_WEBHOOK_SECRET` | **R** (prod webhook ingress) | HMAC verification; **`503`** fail-closed in prod when missing (see example). |
| `SHIPPO_REQUIRE_FULFILLMENT_APPROVAL` | **O/D** | `false` default — **`true`** enforces **`fulfillment_approved_*`** before label purchase (**staff**); Super Admin recovery may bypass (**documented**). |

### 2.6 Optional commerce / semantics

| `UNIFIED_COMMERCE_CHECKOUT` | **O/D** | Correlation preference for storefront. |
| `PAYMENT_INTEGRITY_STALE_HOURS` | **O/D** | Super-admin dashboards. |

### 2.7 Debug / telemetry (optional)

| `OPERATIONAL_IDENTITY_SEARCH_DEBUG` | **O** | Structured logs for Cognito operational identity search. |

---

## 3. Database / schema actions

| Action | Artifact | Notes |
|--------|----------|--------|
| **Verify applied** | `prisma/migrations/20260522183000_fulfillment_group_shippo_approval_gate/migration.sql` | Columns: `fulfillment_approved_at`, `fulfillment_approved_by`. |
| **No orphan rollback** needed | — | Migration is additive. |
| **Future (if product wants finer Shipment lifecycle)** | New migration | Align `Shipment.status` with **`domains/shipping/lifecycle.ts`** vocabulary (`label_created` vs immediate `shipped`) — separate product decision (**P2/P3**). |

---

## 4. Event telemetry — verification & optional completion

| Event / type | Emitter (current) | QA check |
|----------------|-------------------|----------|
| **`fulfillment.approved`** | `OPERATIONAL_EVENT_TYPES.FULFILLMENT_APPROVED` — `app/api/ops/fulfillment/[groupId]/transition/route.ts` | After **Confirm Fulfillment**, row visible in ops order timeline filter list (`loadOperationalOrderConsole`). |
| **`shipment.label_created`** | `runShippoLabelPurchaseForShipment.ts` success path | Timeline + ops consoles show label-created marker. |
| **`shipment.label.failed`** | `emitPlatformEvent` failure path | Appears in failure/webhook-aligned surfaces filtering platform subtypes. |
| **`shipment.label_purchase_blocked`** | *If gated* — verify code path when env **`true`** and no approval | If not yet emitted, **P2**: emit platform or operational subtype on **`422`** in `runShippoLabelPurchaseForShipment` so ops dashboards distinguish “blocked” vs “empty search”. |

**Documentation:** Extend [`operational-events.md`](../operational-events.md) (or sibling) with a one-page matrix: **subtype → emitter → consumer UI**.

---

## 5. UI / code touch list (minimal path to “clean” readiness)

| # | Task | Primary files |
|---|------|----------------|
| 1 | Fix ESLint hook violations | Maintenance page, impersonation components |
| 2 | Delete **`app/ops`** Router tree post-QA | `app/ops/**/*` removal + redirect-only policy in `next.config.ts` |
| 3 | Grep cleanup | **`rg '/ops'`** — eliminate stale links except redirects + **`/api/ops`** + docs |
| 4 | Optional P2 emits | **`runShippoLabelPurchaseForShipment`** return path for **`label_purchase_blocked`** |
| 5 | Middleware decision | `middleware.ts` docs or matcher change (**§1 cross-cutting**) |

---

## 6. Documentation updates checklist

| Document | Update |
|-----------|--------|
| [`ops-to-admin-console-migration.md`](./ops-to-admin-console-migration.md) | Final status: **`app/ops`** removed?, **`/api/ops`** stance. |
| [`operational-authority-boundaries.md`](./operational-authority-boundaries.md) | Super-admin middleware posture + recovery bypass for Shippo gate. |
| [`operational-events.md`](../operational-events.md) | Fulfillment + shipment label matrix (**§4**). |
| [`production-readiness-post-ops-audit-2026-05.md`](./production-readiness-post-ops-audit-2026-05.md) | Link **this plan** from executive summary footer. |
| Runbooks [`docs/runbooks/`](../runbooks/README.md) | **Shippo prod secret**, **`SHIPPO_REQUIRE_FULFILLMENT_APPROVAL` rollout**, **`prisma migrate deploy`**. |

---

## 7. QA / verification plan (executable)

### 7.1 Customer

- [ ] **C1** Browse `/`, `/menu`, `/shop` (unauthenticated where expected).
- [ ] **C2** Cart + checkout draft; **`POST /api/orders`** / **`POST /api/order`** correlation per **`UNIFIED_COMMERCE_*`** posture.
- [ ] **C3** Square sandbox payment success; webhook updates order to **`paid`** (monitor logs / DB).
- [ ] **C4** **`/account/*`** redirects unauthenticated to login with **`next`** param preserved.

### 7.2 Admin / OPS (`/admin` + `/api/ops`)

- [ ] **A1** Loader pages: **`/admin`**, **`/admin/fulfillment`**, **`/admin/shipping`**, **`/admin/orders`**, **`/admin/communications`**, **`/admin/orders/[id]`**.
- [ ] **A2** **`confirm_fulfillment`** transitions group; **`FULFILLMENT_APPROVED`** surfaces in timeline.
- [ ] **A3** With **`SHIPPO_REQUIRE_FULFILLMENT_APPROVAL=true`**: purchase **blocked** until approved; **`POST purchase-label`** **422** with clear UX; **`false`** allows legacy behavior.
- [ ] **A4** **`OpsPurchaseShippoLabelButton`** reflects gate (disabled + copy).
- [ ] **A5** Manual shipment path still works where designed (**`/api/ops/shipping/manual`**).

### 7.3 Super Admin

- [ ] **S1** Elevated surfaces reject non-**super_admin** (positive + negative tests).
- [ ] **S2** **Shippo recovery** purchases with documented bypass + audit trail.
- [ ] **S3** Spot-check **`/api/super-admin`** routes without middleware — handler returns **401** for anonymous.

### 7.4 Telemetry / audit

- [ ] Confirm **`fulfillment.approved`** row after Confirm Fulfillment.
- [ ] Confirm **`shipment.label_created`** after successful Shippo transaction.
- [ ] Confirm **`shipment.label.failed`** on forced Shippo/API error in staging.

### 7.5 Security / env

- [ ] No secrets in **`NEXT_PUBLIC_*`**.
- [ ] **`SHIPPO_WEBHOOK_SECRET`** set in prod; prod webhook returns **≠503** healthy path.
- [ ] **`SQUARE_WEBHOOK_SIGNATURE_KEY`** matches subscription.

---

## 8. Suggested automated tests (follow-up — not blocking doc)

| Area | Suggestion |
|------|------------|
| API contracts | Lightweight integration tests for **`PATCH .../fulfillment/.../transition`** + **`purchase-label`** with mocked Shippo (**MSW** or stub). |
| RBAC | Table-driven tests asserting **`requireSuperStaffJson`** on sampled **`/api/super-admin`** routes. |
| Redirects | Playwright assertion: **`GET /ops/fulfillment` → `/admin/fulfillment`** (until **`app/ops`** deleted, then optional **410**/`404`). |

---

## 9. Sign-off criteria (production-ready)

- [ ] **P0 ESLint** clean on agreed trees (or repo-wide gate if policy requires).
- [ ] **Migration** applied in production DB.
- [ ] **`tsc --noEmit`** CI green.
- [ ] **`app/ops`** removed **or** explicitly documented exception with TTL owner.
- [ ] **`SHIPPO_*`**, **Square webhook**, **Cognito**, **`INTERNAL_API_SECRET`**, **`IMPERSONATION_SECRET`** verified in staging + prod inventories.
- [ ] Admin **Approve → Purchase/Print** path verified with gate **on** and **off**.

---

*This plan should be tracked as tickets (P0 first). Update this file when gaps close.*
