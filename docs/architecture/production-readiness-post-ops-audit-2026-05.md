# Production readiness — post-ops console audit (2026-05)

**Scope:** Static repo audit (rg/read + local tooling). Runtime behavior on **Vercel / AWS / Cognito / RDS** is **deployment-dependent** unless noted.

---

## 1. Customer surfaces


| Sub-area                             | Status        | Evidence                                                                                                                                                                                             |
| ------------------------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Account portal IA**                | ✅             | `components/platform/navConfig.ts` — `ACCOUNT_PLATFORM_NAV`: `/account`, `/account/orders`, `/account/settings/profile`.                                                                             |
| **Public storefront routes**         | ✅ (structure) | App Router pages present under `app/` (e.g. `app/page.tsx`, `app/shop/page.tsx`, `app/checkout/page.tsx`, `app/order/page.tsx`, `app/menu/page.tsx`) — **live correctness** is deployment-dependent. |
| **Storefront APIs vs internal gate** | ✅             | `middleware.ts` — `isPublicStorefrontApi` allows `/api/orders`, `/api/cart` through without `INTERNAL_API_SECRET`; non-`/api` paths skip internal gate.                                              |
| **Checkout / payments env**          | ⚠️            | Payment integration is **Square** (see §6). End-to-end PSP + webhook behavior not verified here.                                                                                                     |


---

## 2. Admin / OPS surfaces


| Sub-area                          | Status        | Evidence                                                                                                                                                                                                                                                                                          |
| --------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Canonical staff nav**           | ✅             | `components/platform/navConfig.ts` — `ADMIN_PLATFORM_NAV` lists `/admin` dashboard, fulfillment, shipping, orders, communications, settings, etc.                                                                                                                                                 |
| **Order console & fulfillment**   | ✅             | `app/admin/orders/[id]/page.tsx`, `components/operations/order-console/OperationalOrderConsole.tsx`, `lib/operations/orderConsole/loadOperationalOrderConsole.ts`. Transitions: `components/operations/order-console/ConfirmFulfillmentButton.tsx` → `PATCH /api/ops/fulfillment/.../transition`. |
| **Fulfillment board**             | ✅             | `app/admin/fulfillment/page.tsx` — uses `opsLoadFulfillmentBoard`, `getOpsSession`, `opsCan`.                                                                                                                                                                                                     |
| **Shipping queue**                | ✅             | `app/admin/shipping/page.tsx` — `opsLoadShippingQueue`; purchase: `components/governance/OpsPurchaseShippoLabelButton.tsx` → `POST /api/ops/shipping/purchase-label`.                                                                                                                             |
| **Communications**                | ✅             | `app/admin/communications/page.tsx`, `app/admin/communications/[threadId]/page.tsx`.                                                                                                                                                                                                              |
| **Staff JSON API namespace**      | ✅ (by design) | **10** handlers under `app/api/ops/`** (fulfillment transition, shipping purchase/manual, communications, refunds, support). Documented in `docs/architecture/ops-to-admin-console-migration.md` and `docs/architecture/operational-authority-boundaries.md`.                                     |
| **Legacy `/ops` App Router tree** | ⚠️            | `**app/ops/`** is still present** (12 `.tsx` files under `app/ops/(console)/` plus `layout.tsx`), while `next.config.ts` installs **temporary** redirects from browser `/ops/*` to `/admin/*`. Risk: duplicate UI drift unless redirects fully shadow routes (verify on deployed host).           |


---

## 3. Super Admin surfaces


| Sub-area                            | Status      | Evidence                                                                                                                                                                                                                                                |
| ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sidebar IA**                      | ✅           | `components/platform/navConfig.ts` — `SUPER_ADMIN_PLATFORM_NAV` (operations, commerce, identity, governance). ~**52** `page.tsx` files under `app/super-admin/`** (glob).                                                                               |
| `**/api/super-admin/*` middleware** | ⚠️          | `middleware.ts` `config.matcher` **does not** include `/api/super-admin/:path*`; `docs/architecture/operational-authority-boundaries.md` states reliance on **handler-level** guards.                                                                   |
| **Recovery / elevated actions**     | ✅ (pattern) | Example: `app/api/super-admin/operations/recovery/shippo-label/route.ts`; ops UI references `POST /api/ops/shipping/purchase-label` in `app/super-admin/shipping-operations/[shipmentId]/page.tsx`. **Authorization correctness** deployment-dependent. |
| **Impersonation & governance UX**   | ⚠️          | `components/governance/ImpersonationBanner.tsx`, `middleware.ts` + `IMPERSONATION_SECRET` in `.env.example`. ESLint violations in governance components (§7).                                                                                           |


---

## 4. Database / schema (`fulfillmentApprovedAt`, migrations)


| Check                                        | Status | Evidence                                                                                                                                                                                                                                            |
| -------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prisma model**                             | ✅      | `prisma/schema.prisma` — `FulfillmentGroup.fulfillmentApprovedAt` (`fulfillment_approved_at` timestamptz), `fulfillmentApprovedBy`.                                                                                                                 |
| **Migration present**                        | ✅      | `prisma/migrations/20260522183000_fulfillment_group_shippo_approval_gate/migration.sql` — `ALTER TABLE fulfillment_groups ADD fulfillment_approved_at`, `fulfillment_approved_by`.                                                                  |
| **Application usage**                        | ✅      | Writes: `app/api/ops/fulfillment/[groupId]/transition/route.ts`. Reads/gates: `lib/shipping/runShippoLabelPurchaseForShipment.ts`, `components/governance/OpsPurchaseShippoLabelButton.tsx`, admin/super-admin pages passing prop into row actions. |
| `**prisma validate` (no `DATABASE_URL`)**    | ❌      | Fails with **P1012** `Environment variable not found: DATABASE_URL` when var unset.                                                                                                                                                                 |
| `**prisma validate` (dummy `DATABASE_URL`)** | ✅      | Schema validates when `DATABASE_URL` is set to any non-empty Postgres URL (local audit only).                                                                                                                                                       |
| **Production DB applied migration**          | ⚠️     | **deployment-dependent** — confirm `prisma migrate deploy` / migration history on the target database.                                                                                                                                              |


---

## 5. Event telemetry (`FULFILLMENT_APPROVED`, `shipment.label*`, `emitOperationalEvent`)


| Signal                                     | Status | Evidence / gap                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `**fulfillment.approved`**                 | ✅      | `lib/operations/operationalEventTypes.ts` — `FULFILLMENT_APPROVED: "fulfillment.approved"`. Emitted in `app/api/ops/fulfillment/[groupId]/transition/route.ts` via `emitOperationalEvent({ type: OPERATIONAL_EVENT_TYPES.FULFILLMENT_APPROVED, ... })`. Consumed in timeline filter list: `lib/operations/orderConsole/loadOperationalOrderConsole.ts` (includes `OPERATIONAL_EVENT_TYPES.FULFILLMENT_APPROVED`). |
| **Literal grep `FULFILLMENT_APPROVED`**    | ⚠️     | Appears as **identifier** in code/docs above; runtime string is `**fulfillment.approved`**.                                                                                                                                                                                                                                                                                                                       |
| `**shipment.label_created` (operational)** | ✅      | `OPERATIONAL_EVENT_TYPES.SHIPMENT_LABEL_CREATED` → `"shipment.label_created"` in `lib/operations/operationalEventTypes.ts`. Emitted in `lib/shipping/runShippoLabelPurchaseForShipment.ts` after successful label persistence.                                                                                                                                                                                    |
| `**shipment.label.failed` (platform)**     | ✅      | `lib/platform/events/taxonomy.ts` — `SHIPMENT_LABEL_FAILED: "shipment.label.failed"`. Failure paths in `runShippoLabelPurchaseForShipment` use `emitPlatformEvent` with that subtype.                                                                                                                                                                                                                             |
| **Grep `shipment.label` substring**        | ⚠️     | Matches include `**shipment.label_created`**, `**shipment.label.failed**`, UI copy in `app/super-admin/shipping-operations/[shipmentId]/page.tsx`, and domain doc `domains/shipping/events.ts` (`shipment.label_purchased`) — **naming is not uniform** across domain vs operational taxonomy.                                                                                                                    |
| `**emitOperationalEvent` footprint**       | ✅      | **21** TypeScript modules reference it (rg `emitOperationalEvent` in `*.ts` / `*.tsx`), including `emitPlatformEvent` bridge, orders, email, Cognito, payments, ops transition, etc.                                                                                                                                                                                                                              |
| **Gaps**                                   | ⚠️     | Best-effort emitters (`lib/operations/emitOperationalEvent.ts` logs failures) — **no guarantee** of completeness for offline analysis without DB/event consumer verification (**deployment-dependent**).                                                                                                                                                                                                          |


---

## 6. Environment & security


| Topic                                 | Finding                 | Evidence                                                                                                                                                                                                                                                                                                        |
| ------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Payment provider**                  | **Square** (not Stripe) | `.env.example` — `SQUARE_ENVIRONMENT`, `SQUARE_ACCESS_TOKEN`, `SQUARE_WEBHOOK_SIGNATURE_KEY`, …; `package.json` dependency `"square"`. Repo grep for production `STRIPE_*` vars: **no matches** in env/config (only benign “Stripe/Linear-style” comment in `components/super-admin/SuperAdminEmptyPanel.tsx`). |
| **Secrets vs public**                 | ✅ (documented intent)   | `.env.example` comments: SES and orchestration vars “never NEXT_PUBLIC_*”.                                                                                                                                                                                                                                      |
| `**NEXT_PUBLIC_*` in `.env.example`** | ⚠️                      | `**NEXT_PUBLIC_SITE_URL**` only (plus instructional comment referencing `NEXT_PUBLIC_*`). Anything prefixed `NEXT_PUBLIC_` ships to browsers — treat as public; avoid embedding secrets.                                                                                                                        |
| **Shippo / fulfillment gate**         | ⚠️                      | `SHIPPO_REQUIRE_FULFILLMENT_APPROVAL` (default `false` in example), `SHIPPO_WEBHOOK_SECRET` required semantics documented in `.env.example`. Production must align env + `VERCEL_ENV` / `NODE_ENV` behavior (**deployment-dependent**).                                                                         |
| **Cognito / impersonation**           | ⚠️                      | `COGNITO_*`, `IMPERSONATION_SECRET`, `INTERNAL_API_SECRET` — rotation, length, and IAM for `COGNITO_IDP_ADMIN_*` not verifiable from repo alone.                                                                                                                                                                |


---

## 7. Lint / typecheck commands (local run, 2026-05-22)


| Command                                                                                          | Result                           | Notes                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npx prisma validate`                                                                            | **Fail** if `DATABASE_URL` unset | Error **P1012** at `prisma/schema.prisma:7`.                                                                                                                                                     |
| `npx prisma validate` (with dummy `DATABASE_URL`)                                                | **Pass**                         | Structural validation only.                                                                                                                                                                      |
| `npx tsc --noEmit`                                                                               | **Pass**                         | No TypeScript errors reported for full project at audit time.                                                                                                                                    |
| `eslint` on `app/admin`, `components/operations`, `components/governance`, `components/platform` | **Fail** (3 errors)              | `react-hooks/set-state-in-effect`: `app/admin/settings/maintenance/page.tsx:44`; `components/governance/ImpersonationBanner.tsx:103`; `components/governance/StartCustomerImpersonation.tsx:23`. |


---

## 8. Residual `/ops`: count & categorization


| Category                                             | Count                | Notes                                                                                                                                                                                                                           |
| ---------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js redirects** (`next.config.ts` → `/admin…`) | **9** rules          | `/ops`, `/ops/orders/:path*`, `/ops/settings`, `/ops/support`, `/ops/login` (+ `:path*`), `/ops/fulfillment`, `/ops/shipping`, `/ops/communications` (+ `:path*`). All `permanent: false` (302-style migration).                |
| **Legacy React pages (`app/ops/`**)**                | **12** `.tsx` files  | e.g. `app/ops/(console)/orders/page.tsx`, `.../fulfillment/page.tsx`, `.../shipping/page.tsx`, layouts. **Parallel codebase** alongside `/admin` — categorize as **transitional duplication**, not inherently a redirect “bug”. |
| **Stable staff APIs (`/api/ops/...`)**               | **10** route modules | Intended namespace per architecture docs — **not** legacy bookmarks.                                                                                                                                                            |
| **Other repo references**                            | Many                 | Documentation (`docs/architecture/*.md`), loaders (`lib/admin/adminConsoleLoaders.ts`), client `fetch('/api/ops/…')`.                                                                                                           |


**Interpretation:** “Residual `/ops`” is primarily **redirects + duplicate page tree + intentional `/api/ops`**. No evidence in this audit of broken redirect *definitions* in config; whether **all** URLs resolve as intended on the deployed edge is **deployment-dependent**.

---

## 9. Middleware & config cross-check


| Item                         | Finding                                                                                                         | File                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Cognito protected paths**  | `/api/ops` always protected; prefixes from `COGNITO_PROTECTED_PREFIXES` default `/account,/admin,/super-admin`. | `lib/auth/cognito/guards.ts` (`isCognitoProtectedPath`).    |
| **Matcher includes ops API** | ✅ `"/api/ops/:path*"` listed.                                                                                   | `middleware.ts` `export const config = { matcher: [...] }`. |
| `**app/ops` directory**      | ⚠️ **Exists** — not absent.                                                                                     | `app/ops/(console)/*`*, `app/ops/layout.tsx`.               |
| `**next.config` redirects**  | ✅ Legacy `/ops` browser paths forwarded to `/admin`.                                                            | `next.config.ts` `redirects()`.                             |


---

## 10. QA checklist (tables)

### 10.1 Customer / storefront smoke


| #   | Scenario                   | Pass criteria                                                                               |
| --- | -------------------------- | ------------------------------------------------------------------------------------------- |
| C1  | Home + menu browse         | `/`, `/menu`, `/shop` render without Cognito (**deployment-dependent**).                    |
| C2  | Checkout draft + order API | `/api/cart`, `/api/orders` accept traffic without orchestration secret per `middleware.ts`. |
| C3  | Account gate               | `/account/*` redirects unauthenticated users to `/login` with `next` param (`cognitoGate`). |


### 10.2 Admin / ops smoke


| #   | Scenario                         | Pass criteria                                                                                                                                                                                                 |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Admin dashboard load             | Authenticated admin can open `/admin` (`ADMIN_PLATFORM_NAV` targets).                                                                                                                                         |
| A2  | Fulfillment approve → label gate | With `SHIPPO_REQUIRE_FULFILLMENT_APPROVAL=true`, confirm `fulfillmentApprovedAt` set (`PATCH .../transition`) before purchase succeeds (`OpsPurchaseShippoLabelButton`, `runShippoLabelPurchaseForShipment`). |
| A3  | Order console timeline           | Operational events include `fulfillment.approved` and `shipment.label_created` where applicable (`loadOperationalOrderConsole` filter list).                                                                  |


### 10.3 Super Admin smoke


| #   | Scenario              | Pass criteria                                                                                                   |
| --- | --------------------- | --------------------------------------------------------------------------------------------------------------- |
| S1  | Elevated route access | Super-admin pages require correct Cognito group + handler checks (**deployment-dependent**).                    |
| S2  | `/api/super-admin/*`  | No reliance on middleware Cognito envelope — verify each route’s guard (`operational-authority-boundaries.md`). |


### 10.4 Data & ops hygiene


| #   | Scenario   | Pass criteria                                                                                                            |
| --- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| D1  | Migrations | `20260522183000_fulfillment_group_shippo_approval_gate` applied in prod DB.                                              |
| D2  | Webhooks   | Square + Shippo signature secrets configured; Shippo returns 503 if misconfigured in prod (per `.env.example` comments). |


---

## 11. Implementation plan — prioritized gap list


| Priority | Gap                                                                                                                     | Suggested remediation                                                                                                                                                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0**   | **ESLint regressions** in admin/settings + governance impersonation UX                                                  | Fix `react-hooks/set-state-in-effect` in `app/admin/settings/maintenance/page.tsx`, `components/governance/ImpersonationBanner.tsx`, `components/governance/StartCustomerImpersonation.tsx`; re-run ESLint scopes from §7.                                  |
| **P0**   | **Prod DB migration parity**                                                                                            | Runbook: `pnpm`/`npm run db:migrate` (or CI deploy step) verifying `fulfillment_approved_at` columns exist outside dev.                                                                                                                                     |
| **P1**   | **Duplicate `app/ops` tree** vs redirects                                                                               | Either delete `app/ops/(console)` after parity QA, or add explicit `redirect`/`rewrite` audit in CI comparing route lists to `ADMIN_PLATFORM_NAV`; align internal links to `/admin` only (`docs/architecture/admin-unified-operating-system.md` direction). |
| **P1**   | `**/api/super-admin` middleware posture**                                                                               | Conscious choice: document threat model OR add selective matcher rows if product wants edge-level Cognito validation (coordinate with handler guards to avoid double-break).                                                                                |
| **P2**   | **Event naming coherence** (`shipment.label_purchased` vs `shipment.label_created` vs platform `shipment.label.failed`) | Normalize taxonomy in `domains/shipping/events.ts` + operational docs, or alias consumers (`OperationalFailuresInbox` already filters `shipment.label.failed`).                                                                                             |
| **P2**   | `**prisma validate` in CI without secrets**                                                                             | Export dummy `DATABASE_URL` in CI for schema-only validation, or document that validate requires env.                                                                                                                                                       |
| **P3**   | **Deployment readiness docs**                                                                                           | Link this audit to `app/super-admin/operations/readiness` page (if used) and env keys: `SHIPPO_REQUIRE_FULFILLMENT_APPROVAL`, `SHIPPO_WEBHOOK_SECRET`, Square webhook URL alignment.                                                                        |


---

## Executive summary (for coordinators)

**File:** `docs/architecture/production-readiness-post-ops-audit-2026-05.md`.

1. **Schema & migrations:** `fulfillmentApprovedAt` / `fulfillmentApprovedBy` are modeled in Prisma and added by migration `20260522183000_fulfillment_group_shippo_approval_gate`; apply status in prod is **deployment-dependent**. `**tsc --noEmit` passes**; `**prisma validate` requires `DATABASE_URL`**. `**eslint` fails** on three React hook rules under admin + governance. **Payments:** `.env.example` and dependencies indicate **Square**, not Stripe. `**app/ops` UI still exists** while `**next.config.ts` redirects `/ops/*` to `/admin/*`** and `**/api/ops/**` remains the staff API surface** — residual risk is duplication/maintenance, not missing admin routes.
2. **Telemetry:** `fulfillment.approved` and `shipment.label_created` are emitted on the confirm transition and Shippo purchase paths respectively; platform failures use `shipment.label.failed`. `**emitOperationalEvent` is used across 21 modules**; delivery guarantees and super-admin API edge auth remain **deployment-dependent**.

---

**Action plan (developer handoff):** [production-readiness-implementation-plan-2026-05.md](./production-readiness-implementation-plan-2026-05.md).

**Filled remediation (executable snippets / env matrix / QA):** [production-readiness-remediation-filled-2026-05.md](./production-readiness-remediation-filled-2026-05.md)

---

*Generated from repository inspection; production behavior must be confirmed in the target environment.*