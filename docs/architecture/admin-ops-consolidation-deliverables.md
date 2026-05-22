# Admin unified OS — consolidation deliverables (working doc)

Companion to [`admin-unified-operating-system.md`](./admin-unified-operating-system.md). Tracks overlap, gaps, and migration notes.

---

## 1. Overlap audit (Admin vs `/ops`)

| `/ops/(console)` surface | `/admin` counterpart | Parity notes |
|--------------------------|---------------------|--------------|
| `/ops` (Today queues) | `/admin` (home dashboard) | **Partial.** Admin home uses `loadAdminHomeDashboard()`; ops root uses `opsLoadTodayQueues()` (`lib/ops/queries`). Same domain models, different composition—no automated redirect `/ops` → `/admin` yet. |
| `/ops/orders`, `/ops/orders/[id]` | `/admin/order-lookup` | **Gap.** Lookup page is scaffolding and deep-links **to** ops; rich order console only under ops. |
| `/ops/fulfillment` | `/admin/fulfillment` | **Parity.** Redirect added (302). |
| `/ops/shipping` | `/admin/shipping` | **Parity.** Redirect added (302). |
| `/ops/support` | `/admin/support` | **Parity.** Redirect added (302). |
| `/ops/communications` | `/admin/communications` | **List parity.** Redirect added (302). |
| `/ops/communications/[threadId]` | `/admin/communications` | **Gap.** Admin has **no** thread-id route in `app/`; redirect drops thread context—operators use list/search until thread deep-links exist under admin. |
| `/ops/settings` | Multiple `/admin/settings/**` | **Gap.** Ops settings snapshot is read-only amalgam; closest pieces are integrations / maintenance / operations settings—no single 1:1 page. |

---

## 2. Consolidation plan (incremental)

- **Canonical URLs:** Prefer `/admin/**` for business execution surfaces that exist today.
- **Redirects:** `/ops/fulfillment|shipping|support|communications` (+ comms `:threadId` → list) temporarily 302 to admin.
- **Loader sharing:** Dedupe ops “today queues” vs `adminConsoleLoaders` in later PR (`lib/operations` composition roots per architecture doc)—not collapsed in initial redirect PR.
- **Orders console:** Highest remaining divergence; migrate `loadOperationalOrderConsole` UX under `/admin/orders/[id]` (or elevate `order-lookup`) before redirecting `/ops/orders`.

---

## 3. Admin home proposal (implemented direction)

Queue-first layout: truthful counts from **`loadAdminHomeDashboard()` only** (`queueSummaries`, `alerts`, `activitySteps`, `shipmentExceptions`, catering preview, fulfillment previews). Explicit empty states—no fabricated rates or SLA percentages. Incident/error strip only when loaders return rows.

---

## 4. First targets (engineering)

1. Redirect parity routes (**done**): fulfillment, shipping, support, communications.
2. **`/admin/communications/[threadId]`** (next): restore deep-link parity lost on comms redirects.
3. **Order console migration** (`/admin/orders/**` + loaders already used by ops).
4. Merge or reconcile **home** payloads: unify `opsLoadTodayQueues` with dashboard fan-out behind one module.

---

## 5. Shared service / loader recommendation

- **`lib/operations`** remains domain spine (per architecture doc).
- **`adminConsoleLoaders`** as composition layer should call shared query helpers extracted from **`lib/ops/queries`** where shapes overlap (`opsLoadTodayQueues` ↔ queue slices in home).
- **Short-term:** JSDoc / this doc linkage; avoid dead re-exports until a consumer absorbs them.

---

## 6. Migrate-first routes

| Priority | Redirect / build |
|---------|-------------------|
| P1 | Ops fulfillment, shipping, support, communications → admin (**302**). |
| P2 | Admin communications thread routes (build), then tighten comms redirects. |
| P3 | Admin orders console + redirects from `/ops/orders`. |

---

## 7. Theater / honesty areas

- **`slaHint`** on queue summaries is **descriptive prose** grounded in loaders (counts + ages), not a numeric SLA score—prefer plain “what this count measures” wording in UI.
- **Failed email deliveries** count is lifetime in loader comments—label honestly on consumer surfaces.

---

## 8. UX direction (queues & home)

- Dense, link-driven queue table on home → detail screens (`/admin/queues`, fulfillment, shipping, refunds, communications).
- Strip command-center metaphors from admin home (“command center”, “floor”, optional manifest stamps).
- Super Admin links in **`loadAdminOperationalAlerts`** remain intentional governance escape hatches—not mixed into fake business KPIs.

---

## 9. Risks / mitigations

| Risk | Mitigation |
|------|------------|
| Comms `:threadId` redirect loses bookmarked thread | Short-term documented gap; medium-term `/admin/communications/[threadId]`. |
| Orders still on `/ops` | Internal links/email must keep `/ops/orders` until admin parity lands. |
| Double auth paths | Middleware already treats **`/admin` and `/ops`** under Cognito; redirects preserve prefixes and cookies. |

---

## 10. Phased execution order

1. **Navigation + redirects** for parity shells (increment A).
2. **Loader dedupe** highest-traffic crossovers (order console, queues).
3. **Dashboard honesty** passes (ongoing via `loadAdmin*` contract).
4. **Route renaming** (`order-lookup` → `orders`) after redirects stable.
5. **Remove ops-only layouts** when traffic and QA confirm cutover.

---

*Last updated: consolidation pass on admin home + selective `/ops` → `/admin` redirects.*
