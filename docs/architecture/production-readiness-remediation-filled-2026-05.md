# Production readiness — **filled** remediation guide (2026-05)

**Sources:** [`production-readiness-post-ops-audit-2026-05.md`](./production-readiness-post-ops-audit-2026-05.md), [`production-readiness-implementation-plan-2026-05.md`](./production-readiness-implementation-plan-2026-05.md).

**Purpose:** Ticket-ready steps with **file paths**, **snippets**, **env matrix**, **migration references**, **telemetry wiring**, **security notes**, and **QA**. This **does not duplicate** the audit tables; it **executes** the gaps.

---

## Summary table (gap → remediation → priority)

| Priority | Gap | Remediation (one line) | Primary deliverable |
|----------|-----|------------------------|---------------------|
| **P0** | ESLint `react-hooks/set-state-in-effect` ×3 | Refactor three components (§2.1), **verified** **`eslint`** clean | Pass `eslint` CI |
| **P0** | Prod DB may lack `fulfillment_approved_*` | Run **`prisma migrate deploy`**; SQL verify (§3) | Columns on `fulfillment_groups` |
| **P1** | `app/ops/**` still duplicates `/admin` | Duplicate tree **removed**; redirects-only (**§2.5**); grep cleanup (**done**) | No duplicate App Router shell |
| **P1** | `/api/super-admin` not in middleware matcher | **Option A documented** — handler-only JWT / `requireSuperStaffJson` posture (§5.3); Option B deferred | Written decision (**no matcher change**) |
| **P1** | Square PSP QA not automated | Staging webhook + checkout script (§7.1) | Sign-off record |
| **P2** | `shipment.label_purchase_blocked` not emitted | `PLATFORM_EVENT_SUBTYPE` + `emitPlatformEvent` on `422` gate (§2.3) — **verified in repo** | Observable blocked attempts |
| **P2** | `prisma validate` in CI without secrets | Dummy `DATABASE_URL` job env (§3.3) | Green schema job |
| **P2** | Event taxonomy drift `label_purchased` vs `label_created` | Documentation matrix + optional alias (§6.4) | Single source of truth doc |
| **P3** | Rollout comms for `SHIPPO_REQUIRE_FULFILLMENT_APPROVAL=true` | Runbook + staff announcement (§8) | Ops readiness |

---

## 1. Environment variables — production reference

**Repo naming:** There is **no** `COGNITO_ISSUER` or `COGNITO_APP_CLIENT_ID` env var. **JWT `iss`** is built as `https://cognito-idp.<region>.amazonaws.com/<userPoolId>` via **`cognitoIssuer()`** in `lib/auth/cognito/config.ts`. The app client id is **`COGNITO_CLIENT_ID`**.

| Variable | Required | Default / when optional | Example format | Purpose | If missing / wrong |
|-----------|----------|-------------------------|----------------|---------|-------------------|
| `DATABASE_URL` | **Yes** (build/validate/migrate/runtime) | — | `postgresql://user:pass@host:5432/db?sslmode=require` | Prisma Postgres | `P1012` / app down |
| `NEXT_PUBLIC_SITE_URL` | **Yes** (public URLs) | — | `https://orders.example.com` | Browser-visible origin | Broken links/redirects |
| `INTERNAL_API_SECRET` | **Yes** (prod non-public API) | Must be **≥24** chars per `middleware.ts` | 32+ char random | Orchestration gate | **503** `INTERNAL_SECRET_MISSING` or **401** |
| `COGNITO_REGION` | **Yes** (auth) | — | `us-west-2` | Pool region | Cognito config null |
| `COGNITO_USER_POOL_ID` | **Yes** | — | `us-west-2_XXXXXXX` | Pool id | Auth broken |
| `COGNITO_CLIENT_ID` | **Yes** | — | 26+ char client id | SPA / server token validation | Login broken |
| `COGNITO_CLIENT_SECRET` | **If** confidential client | omit for public PKCE | `<secret>` | `SECRET_HASH` flows | Some admin SDK calls fail |
| `COGNITO_IDP_ADMIN_ACCESS_KEY_ID` | **Recommended** on serverless w/o IAM role | Falls back to AWS keys | `AKIA…` | **`ListUsers`/Admin IdP** | **CredentialsProviderError** on identity search |
| `COGNITO_IDP_ADMIN_SECRET_ACCESS_KEY` | Pair with above | — | `<secret>` | Same | Same |
| `COGNITO_ISSUER` | **Not used** | N/A | Compute: `cognitoIssuer(config)` | — | N/A |
| `COGNITO_APP_CLIENT_ID` | **Alias only in docs** — use `COGNITO_CLIENT_ID` | N/A | Same as client id | Avoid duplicate env | Confusion only |
| `IMPERSONATION_SECRET` | **Yes** (prod) | **Never** rely on dev unsafe | 32+ hex | HMAC `momos_impersonation` cookie | Impersonation disabled / insecure |
| `IMPERSONATION_ALLOW_UNSAFE_DEV` | **No** | **`false` in prod** | `false` | Dev-only escape | **Critical** if `true` in prod |
| `SQUARE_ENVIRONMENT` | **Yes** | — | `production` or `sandbox` | Square API host | Wrong catalog/payment env |
| `SQUARE_ACCESS_TOKEN` | **Yes** | — | `EAAA…` | Merchant API | Charges/webhooks fail |
| `SQUARE_LOCATION_ID` | **Yes** | — | `L…` | Orders/catalog context | Checkout errors |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | **Yes** (live webhooks) | — | From Square subscription | `POST /api/webhooks/square` HMAC | **401** on webhooks |
| `SQUARE_WEBHOOK_NOTIFICATION_URL` | **Yes** (subscription match) | Must match console **exactly** | `https://…/api/webhooks/square` | Byte-for-byte URL match | Signature failures |
| `SHIPPO_API_KEY` | **Yes** (shipping) | — | `shippo_…` | Rates + labels | Shipping down |
| `SHIPPO_ENV` | **No** | Often `production` in code comments | `production` | Client mode guard | Misaligned test/prod |
| `SHIPPO_WEBHOOK_SECRET` | **Yes** (`NODE_ENV`/Vercel prod) | Fail-closed 503 when missing in prod | HMAC signing secret | **`/api/webhooks/shippo`** | **503** in prod (`shippoInboundProductionGate`) |
| `SHIPPO_REQUIRE_FULFILLMENT_APPROVAL` | **No** | **`false`** (must be literal `true` to enable gate) | `true` \| `false` | **RETAIL** label purchase requires **`fulfillmentApprovedAt`** | `false`: legacy immediate purchase allowed |
| `AWS_REGION` / `AWS_DEFAULT_REGION` | **For SES/SDK** | — | `us-west-2` | SES + SDK default region | SES health fails |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | **Conditional** | Use IAM role on AWS where possible | `AKIA…` | SES / shared SDK chain | SES/S3/Shippo IAM-dependent paths fail |
| `AWS_SESSION_TOKEN` | **Optional** | With temporary creds | token string | STS sessions | —
| SES vars (`SES_FROM_EMAIL`, etc.) | **Per mail feature** | See `.env.example` | RFC822 / ARNs | Outbound/inbound mail | Mail pipeline down |
| `OPERATIONAL_IDENTITY_SEARCH_DEBUG` | **No** | unset | `true` | JSON logs for Cognito search | —
| `PAYMENT_INTEGRITY_STALE_HOURS` | **No** | `24` in semantics | integer | Dashboard staleness | Default semantics |
| `UNIFIED_COMMERCE_CHECKOUT` | **No** | checkout correlation on when unset | `0`/`off` disables | Draft order discipline | Behavioral (documented in example) |

**Stripe:** Not used — do **not** set `STRIPE_SECRET_KEY` expecting this codebase to read it.

---

## 2. Filled remediation — code & UI

### 2.1 P0 — ESLint `react-hooks/set-state-in-effect`

**Repo status (2026-05):** Patterns below are **implemented** — **`npx eslint … --max-warnings 0`** on the listed files succeeds.

**Files:**  
- `app/admin/settings/maintenance/page.tsx`  
- `components/governance/ImpersonationBanner.tsx`  
- `components/governance/StartCustomerImpersonation.tsx`  

#### A) `StartCustomerImpersonation.tsx` (prop → state sync anti-pattern)

**Problem:** Lines 20–24 sync **`prefilledEmail`** into **`email`** inside `useEffect`, which violates **`react-hooks/set-state-in-effect`**.

**Fix (preferred — remount when prefilled identity changes):**  
Parents (e.g. super-admin customer page) wrap:

```tsx
<StartCustomerImpersonation
  key={prefilledEmail ?? "__none__"}
  prefilledEmail={prefilledEmail}
/>
```

**Then** simplify child to drop the `useEffect` and initialize once:

```tsx
export default function StartCustomerImpersonation({ prefilledEmail = null }: Props) {
  const [email, setEmail] = useState(prefilledEmail?.trim() ?? "");
  // REMOVE the useEffect that called setEmail when prefilledEmail changes
```

**Expected:** ESLint passes; prefilled flows still work when **`key`** updates.

#### B) `ImpersonationBanner.tsx` — interval ticker

**Problem:** Effect at ~106–109 calls **`setNow(Date.now())`** on an interval tied to **`data`** — some configs flag this.

**Fix options (pick one):**

1. **Extract** a tiny child **`ImpersonationDurationClock`** that receives **`startedAt`** and owns **`now`** state + interval internally (isolates lint scope), **or**
2. **`useReducer`** with **`{ type: 'tick' }`** dispatched from interval (`dispatch` identity stable), **or**
3. **`eslint-disable-next-line react-hooks/set-state-in-effect`** with comment: *“Periodic UI clock; no prop sync.”*

**Expected:** Lint clean without behavior change.

#### C) `app/admin/settings/maintenance/page.tsx`

**Problem:** Typically **`useEffect(() => void load(), [load])`** where **`load`**’s identity changes invoke effect that sets loading state — flagged on strict setups.

**Fix:** Split **initial load** vs **manual refresh**:

- Use **`useRef`** for **`load`** stable identity **`void useEffect(() => { void loadOnce(); }, []);`** where **`loadOnce`** is **`useCallback(..., [])`** reading latest fetch via ref, **or**
- Move **`load`** definitions **inside** **`useEffect`** with exhaustive comment and **`// eslint-disable-next-line`** scoped to mount-only fetch pattern.

**Expected:** Lint clean; UX unchanged (loading spinner on mount + manual refresh).

**Verify:**

```powershell
cd c:\Users\Admin\momos-cafe
npx eslint app/admin/settings/maintenance/page.tsx components/governance/ImpersonationBanner.tsx components/governance/StartCustomerImpersonation.tsx --max-warnings 0
```

---

### 2.2 P0 — Prod migration verification (`fulfillment_approved_*`)

**Already in repo:**

- **`prisma/schema.prisma`** — `FulfillmentGroup.fulfillmentApprovedAt`, `.fulfillmentApprovedBy`
- **`prisma/migrations/20260522183000_fulfillment_group_shippo_approval_gate/migration.sql`** — `ALTER TABLE fulfillment_groups ADD ...`

**Operators run (examples):**

```bash
npx prisma migrate deploy
```

**SQL health check:**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'fulfillment_groups'
  AND column_name IN ('fulfillment_approved_at','fulfillment_approved_by');
```

**Rollback strategy:** Columns are additive — rollback = `ALTER TABLE … DROP COLUMN …` **only** in emergency (loses approvals history).

---

### 2.3 P2 — Telemetry: **`shipment.label_purchase_blocked`**

**Shipped.** On the **`422`** **`fulfillment_not_approved`** path, **`runShippoLabelPurchaseForShipment`** emits **`SHIPMENT_LABEL_PURCHASE_BLOCKED`** (best-effort) before returning.

#### Step 1 — extend taxonomy `lib/platform/events/taxonomy.ts`

```typescript
SHIPMENT_LABEL_PURCHASE_BLOCKED: "shipment.label_purchase_blocked",
```

#### Step 2 — emit **best-effort** before returning the **`422`** (implemented in **`lib/shipping/runShippoLabelPurchaseForShipment.ts`**)

Use **`emitPlatformEvent`** (`EmitPlatformEventInput` — **`message`** not legacy `title`/`body`; see **`lib/platform/events/emitPlatformEvent.ts`**). Persisted **`type`** normalizes from **`subtype`**.

Canonical shape:

```typescript
void emitPlatformEvent({
  subtype: PLATFORM_EVENT_SUBTYPE.SHIPMENT_LABEL_PURCHASE_BLOCKED,
  category: "SHIPMENT_EVENT",
  lifecycle: "cancelled",
  severity: OperationalActivitySeverity.warning,
  actorType: input.actor.actorType,
  actorId: input.actor.sub,
  message: "Label purchase blocked — fulfillment not confirmed for this RETAIL group",
  entities: {
    ...(orderId ? { commerceOrderId: orderId } : {}),
    ...(fulfillmentGroupId ? { fulfillmentGroupId } : {}),
    shipmentId: row.id,
  },
  detail: { reason: "fulfillment_not_approved", recoveryTag: input.emitSourceTag },
  source: { handler: input.emitSourceTag },
  sourceTag: input.emitSourceTag,
});
```

**Note:** **`orderId`** is selected via nested **`fulfillmentGroup: { select: { orderId: true, fulfillmentApprovedAt: true, pipeline: true }}`** on the **`shipment`** row.

**When:** Exactly when **`shippoFulfillmentApprovalRequired()` && !`skipFulfillmentApprovalCheck` && RETAIL pipeline && !`fulfillmentApprovedAt`**.

**QA:** Stub POST **`/api/ops/shipping/purchase-label`** with gate **`true`** and expect **audit row / operational feed** substring **`shipment.label_purchase_blocked`** (whatever consumer exists).

---

### 2.4 Admin workflow — Confirm Fulfillment → Purchase → Print (already wired; verify permissions)

| Step | Mechanism | File / route |
|------|-----------|----------------|
| Confirm | **`PATCH`** `action: "confirm_fulfillment"` | **`app/api/ops/fulfillment/[groupId]/transition/route.ts`** (requires **`opsCan(..., "fulfillment:write")`**) |
| UI button | **`<ConfirmFulfillmentButton />`** | **`components/operations/order-console/ConfirmFulfillmentButton.tsx`** |
| Label buy | **`POST /api/ops/shipping/purchase-label`** | **`app/api/ops/shipping/purchase-label/route.ts`** + **`OpsPurchaseShippoLabelButton`** (`components/governance/OpsPurchaseShippoLabelButton.tsx`) |
| Gate | **`SHIPPO_REQUIRE_FULFILLMENT_APPROVAL`** + **`fulfillmentApprovedAt`** | **`lib/shipping/runShippoLabelPurchaseForShipment.ts`** (lines ~56–115) |
| Super-admin bypass | **`skipFulfillmentApprovalCheck: true`** | **`app/api/super-admin/operations/recovery/shippo-label/route.ts`** (audit required) |

**Permission checks:**

- Ops transition:** `getOpsSession` + **`opsCan(session.role, "fulfillment:write")`** (`transition/route.ts` L51–54).
- Label purchase:** **`opsCan(..., "shipping:write")`** in purchase-label handler (confirm in same directory pattern).

**Print / download:** After purchase, **`Shipment.metadata`** persists **`labelUrl`** etc. (**`runShippoLabelPurchaseForShipment`** updates). Ensure **`/admin/shipping`** and **`/super-admin/shipping-operations/[shipmentId]`** render anchor to **`metadata.labelUrl`** (verify JSX if blank — **P2** UI gap ticket).

---

### 2.5 P1 — Remove **`app/ops`** duplicate tree

**Status (verified 2026-05):** **`glob app/ops`** returns **no modules** — the duplicate **`app/ops`** App Router tree is **removed**; **`next.config.ts`** holds **302** redirect sources **`/ops`, `/ops/orders`, …**. Internal **`href="/ops…`** links are absent (remaining **`/ops`** strings are redirect sources, **`/api/ops`**, or prose).

**Historical steps (complete):**

1. Confirm **`next.config.ts`** `redirects()` cover production bookmarks (**`/ops`, `/ops/orders`, …**).
2. **`rg`** `href=.*/ops` — replace **`Link`** targets with **`/admin/…`** **or** **`/login`** where applicable (**done** — no offending **`Link`**s).
3. **`git rm -r app/ops`** (**done**).

---

## 5. Security & middleware

### 5.1 Intended model (preserve)

| Surface | Enforcement |
|---------|--------------|
| `/admin/*`, `/account/*`, `/super-admin/*` (browser) | **`middleware.ts` matcher`** → **`cognitoGate`** |
| **`/api/ops/*`** | Matcher present — JWT cookie + **`getOpsSession`** in handlers |
| **`/api/super-admin/*`** | **Often NOT** in matcher — **handlers** **`requireSuperStaffJson`** / **`isSuperAdmin`** |

Matcher excerpt from **`middleware.ts`**:

```82:93:c:\Users\Admin\momos-cafe\middleware.ts
export const config = {
  matcher: [
    "/api/auth/cognito/:path*",
    ...
    "/api/ops/:path*",
```

### 5.2 Option **B** (optional middleware for super-admin APIs)

**If** product requires edge Cognito envelope for **`/api/super-admin`**:

```typescript
"/api/super-admin/:path*",
```

Add to **`matcher`**, verify **`cognitoGate`** behaves same as pages (risk: double auth / cookie nuances) — **pilot off main branch**.

### 5.3 Current decision (**Option A**) — **`/api/super-admin`** handler-only (**2026-05**)

As shipped, **`middleware.ts`** **`config.matcher`** does **not** include **`/api/super-admin/:path*`**. Super-admin JSON routes rely on **`requireSuperStaffJson`**, **`isSuperAdmin`**, and related per-route checks (avoid edge double-auth and keep staff vs super-admin semantics explicit in handlers).

**Operational implication:** Unsigned or cross-site callers without a valid Cognito session still hit Next.js handlers (not preemptively redirected at edge); handlers return **`401`** / **`403`** as implemented. **`/super-admin/**` **pages** remain Cognito-gated via **`isCognitoProtectedPath`**.

---

## 6. Database / migrations list (no NEW migration unless indexes needed)

| Item | Status | Action |
|------|--------|--------|
| `fulfillment_groups.fulfillment_approved_at/by` | **Shipped SQL** | **Deploy** migration `20260522183000_fulfillment_group_shippo_approval_gate` |
| Index on **`fulfillment_approved_at`** for queues | Optional **P3** | New migration `CREATE INDEX CONCURRENTLY ...` **only if** slow admin queries |

**New migration skeleton (indexes only — example):**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS fulfillment_groups_shippo_gate_idx
ON fulfillment_groups (pipeline, fulfillment_approved_at)
WHERE pipeline = 'RETAIL';
```

**(Use Prisma `@@index` + `migrate dev` — don’t paste raw-SQL-only without team Prisma hygiene.)**

---

## 7. QA & test execution

### 7.1 Manual — Gate **ON**

1. Deploy with **`SHIPPO_REQUIRE_FULFILLMENT_APPROVAL=true`**.
2. Create paid RETAIL shipment with **`selectedShippoRateId`** present.
3. Without confirm: **`POST /api/ops/shipping/purchase-label`** → **422** `fulfillment_not_approved`.
4. From order console (**`/admin/orders/[id]`**): click **Confirm fulfillment** (**`ConfirmFulfillmentButton`**).
5. Repeat purchase → **200** response + **`shipment`** has **`trackingNumber` / metadata label URL**.
6. Super-admin recovery: **`skipFulfillmentApprovalCheck`** path still buys (check audit tables).

### 7.2 Manual — Gate **OFF**

Same flow; purchase allowed **without** step 4 (**legacy expectation**).

### 7.3 Automated snippets

**Jest (API route)** — mock Prisma `findUnique`:

```typescript
jest.mock('@/lib/shipping/runShippoLabelPurchaseForShipment', () => ({
  runShippoLabelPurchaseForShipment: jest.fn(async () => ({
    ok: false,
    httpStatus: 422,
    errorCode: 'fulfillment_not_approved',
  })),
}));
```

Assert handler JSON shape matches ops client.

**Playwright**

```typescript
await page.goto('/admin/orders/order-with-retail-id');
await page.getByRole('button', { name: /confirm fulfillment/i }).click();
await expect(page.getByText(/purchase label/i)).toBeEnabled();
```

---

## 8. Documentation outlines (paste-in snippets)

### 8.1 `docs/architecture/ops-to-admin-console-migration.md`

- **Banner:** `/ops` App Router **`deleted`** (2026-05); **`/api/ops`** remains staff JSON namespace until Phase 2 rename.
- **Redirect table:** cite **`next.config.ts`** paths.
- **Fulfillment gate:** **`SHIPPO_REQUIRE_FULFILLMENT_APPROVAL`** + **`confirm_fulfillment`** + **`skipFulfillmentApprovalCheck`**.

### 8.2 Event taxonomy appendix

```

| Operational string          | Emitter file |
|-----------------------------|----------------|
| fulfillment.approved        | app/api/ops/fulfillment/[groupId]/transition/route.ts |
| shipment.label_created      | lib/shipping/runShippoLabelPurchaseForShipment.ts |
| shipment.label.failed       | Same (failure paths) |
| shipment.label_purchase_blocked | `lib/shipping/runShippoLabelPurchaseForShipment.ts` (`emitPlatformEvent`, gated **`422`**) |

```

### 8.3 Admin workflows runbook **`docs/runbooks/`**

Procedure: **Review queue → Confirm fulfillment → Purchase label → Print PDF from label URL.**

---

## 9. Deliverable checklist (sign-off before prod push)

### Code / repo (**verified locally 2026-05-22**)

- [x] **P0** ESLint — maintenance + impersonation components pass **`npx eslint … --max-warnings 0`**
- [x] **P2** Telemetry + taxonomy — **`shipment.label_purchase_blocked`** emitted on gated **`422`**
- [x] **P1** **`app/ops`** duplicate tree absent; redirects in **`next.config.ts`**
- [x] **P1** Middleware — **§5.3 Option A** recorded (handlers own **`/api/super-admin/*`**)
- [ ] **P0** Migration **deployed to prod/staging DB** + SQL verify (operators — **do not rely on CI alone**)

### Deferred / ops-owned (outside this codebase pass)

- [ ] **Square** staging webhook + checkout script sign-off (**§7.1**)
- [ ] **P2** **`prisma validate`** CI dummy **`DATABASE_URL`** (§3.3 in implementation plan — not re-audited here)
- [ ] **P3** Rollout comms **`SHIPPO_REQUIRE_FULFILLMENT_APPROVAL=true`**
- [ ] QA **§7** manual gate on/off matrices + screenshots on ticket

---

## 10. Implementation status matrix (gap → codebase → QA)

| Priority | Item | Verification / touched surface | QA hint |
|----------|------|--------------------------------|---------|
| **P0** | Hooks lint | **`app/admin/settings/maintenance/page.tsx`** (mount-only **`useEffect`**); **`ImpersonationBanner.tsx`** (**`ImpersonationDurationClock`** child); **`StartCustomerImpersonation.tsx`** (lazy **`useState`**) + **`key`** on parents | **`npx eslint`** scope from §2.1; smoke prefilled impersonation flows |
| **P0** | **`fulfillment_approved_*`** | **`prisma/schema.prisma`** `FulfillmentGroup`; migration **`20260522183000_fulfillment_group_shippo_approval_gate`** | **`prisma migrate deploy`** + **`information_schema`** query §2.2; rollback warning only (**drop columns**) |
| **P1** | `/ops` duplicate tree gone | **`glob app/ops`** empty; **`next.config.ts`** redirects; **`docs/architecture/ops-to-admin-console-migration.md`** | Hit legacy **`/ops/orders`** → lands **`/admin/orders`** |
| **P1** | Middleware super-admin APIs | **`middleware.ts`** — **no** **`/api/super-admin`** in **`matcher`**; **§5.3** | Confirm **`403`/`401`** JSON from unauthenticated super-admin **`POST`** (no phantom edge redirects) |
| **P2** | Label blocked telemetry | **`lib/platform/events/taxonomy.ts`**, **`runShippoLabelPurchaseForShipment.ts`** gated branch | **`SHIPPO_REQUIRE_FULFILLMENT_APPROVAL=true`**, **`POST`** purchase-label → **`422`** + audit subtype **`label_purchase_blocked`** |
| **—** | Admin fulfillment UX | **`ConfirmFulfillmentButton`**, **`OpsPurchaseShippoLabelButton`**, **`OperationalOrderConsole`** (**`flags.canFulfillmentWrite` / `canShippingWrite`**) | Gate on: confirm enables purchase; gate off: purchase without approval |
| **—** | Super-admin recovery unchanged | **`skipFulfillmentApprovalCheck`** documented; **`app/api/super-admin/operations/recovery/shippo-label/route.ts`** | Recovery still buys label with audit (**no widening** attempted here) |

### `.env.example` alignment (§1 refresh)

Canonical template includes **`SHIPPO_REQUIRE_FULFILLMENT_APPROVAL`** (defaults **`false`**). **`OPERATIONAL_IDENTITY_SEARCH_DEBUG`** is listed in §1 matrix and appears as an **optional commented** knob in `.env.example` alongside Cognito (**diagnostics only**).

---

*Link next review from [`production-readiness-implementation-plan-2026-05.md`](./production-readiness-implementation-plan-2026-05.md): add line “Filled execution guide → **production-readiness-remediation-filled-2026-05.md**”.*
