# Admin as unified business operating system

This document describes how **Admin** should function as the single product surface for **business and operational execution**: running the coffee and commerce business day to day (queues, fulfillment, shipping, support, refunds, catering workflows, customer-facing issue resolution, and configuration that affects operations). **Super Admin** remains a separate layer for **platform governance**: cross-tenant controls, integration health at the platform scope, impersonation, failure triage, incidents, and policies that are not the day-to-day workload of a single business operator.

There is **no separate “Ops” product** in the long-term model. Today, an `/ops` area may still exist in the codebase as a parallel console; the direction is to **consolidate operational execution into Admin**, not to maintain two first-class operator experiences. Contributors should treat this document as the target information architecture and engineering direction, while implementing changes incrementally.

---

## 1. Updated Admin information architecture (routes)

Admin’s route map should read like an **operating system for the business**: clear nouns for work queues and entities, with settings and reporting as supporting spaces.

**Conceptual routes** (north star; names should converge here over time):

- **`/admin/orders`** — Order discovery, status, and deep links into operational detail (today this may surface as **`/admin/order-lookup`** or similar; consolidating naming is part of migration, not a claim that `/admin/orders` already exists).
- **`/admin/fulfillment`** — Fulfillment workload, programs, and handoff states.
- **`/admin/shipping`** — Shipments, labels, carrier state, exceptions.
- **`/admin/support`** — Customer issues and operational support cases tied to commerce reality.
- **`/admin/refunds`** — Refund cases and money movement semantics visible to operators with appropriate guardrails.
- **`/admin/catering`** — Catering inquiries and catering orders as first-class queues (possibly split subtrees such as **`/admin/catering/inquiries`** vs **`/admin/catering/orders`** if clarity demands it).
- **`/admin/customers`** — Customer directory and dossier-style context for operators (today this may overlap **`/admin/customer-lookup`** and **`/admin/accounts`**; the IA goal is one coherent “customers” area with predictable sub-routes).
- **`/admin/communications`** — Threads and timelines that reconcile email, SMS, and in-app/admin notes where the product exposes them.
- **`/admin/queues`** — Cross-cutting queue hub when multiple work types need a single entry point.
- **`/admin/reporting`** — Read-mostly operational and business metrics that are safe to cache for UX but must be labeled honestly (see dashboard section).
- **`/admin/settings/**`** — Business-scoped configuration: notifications, integrations, maintenance, operational toggles aligned with **`/admin/settings/operations`** and related pages.

**Super Admin** (`/super-admin/...`) is intentionally **not** listed here as part of Admin’s IA; it is the governance shell. Operational *events* and *communications* may originate or be observable from Super Admin for platform operators, but the **execution** workflows for a normal business belong under Admin.

**`/ops` and legacy overlap:** The repository may still include **`app/ops/(console)/...`** (for example orders, fulfillment, shipping, support, communications). That path should be treated as **legacy or transitional**: either a thin redirect to the equivalent **`/admin/...`** route, a shared layout alias during migration, or a deprecated surface documented in runbooks. The documentation stance is explicit: **consolidate toward `/admin`** without asserting that every ops URL has already been removed or rewired. New feature work should land in Admin unless there is a hard platform-only reason it belongs in Super Admin.

---

## 2. Proposed workspace structure inside Admin

Admin benefits from treating the UI as **workspaces**, not a flat list of pages. A practical grouping:

**Reporting workspace** (`/admin/reporting` and truthful summary tiles on home where appropriate): counts, SLA-adjacent *indicators* (only when grounded in persisted fact), funnel views, exports. Must not pretend to replace source-of-truth screens.

**Settings workspace** (`/admin/settings/...`): configuration with clear impact statements—what changes, what breaks, what requires integrations, and audit visibility where available.

**Operational execution workspace**: fulfillment, shipping, support, refunds, catering execution—the places where operators **change state** in the real world (kitchen, warehouse, carriers, money movement).

**Queue workspace** (`/admin/queues` plus deep links): surfaces optimized for **“what must I do next?”** across entity types (see queue UX section).

**Entity management workspace**: catalog, accounts, customer/staff drilldowns—the slower-moving structural data that operational screens reference. These should deep-link cleanly into operational contexts (order id, shipment id, case id).

This structure is orthogonal to navigation chrome: sidebar sections can mirror these workspaces so operators build muscle memory (“I’m either configuring, observing, executing, or managing master data”).

---

## 3. Home / dashboard restructuring plan

The Admin home dashboard should be reworked toward **truthful metrics**, strong **empty states**, and **de-theater**:

**Truthful metrics** means each number names its source and freshness: “queued fulfillment groups as of DB read,” “open support issues,” “shipments awaiting label,” not vibes or blended counts that imply precision the system does not have. Relative ages can be helpful for prioritization (`formatOpsRelativeAge` patterns in loaders) when they are clearly **non-SLA**.

**Empty states** should explain *why* zero is sane (“no open refunds in the selected window”) and offer **next actions** (“sync catalog,” “open fulfillment,” “check integration health”—with business-appropriate wording and permissions).

**De-theater** means removing misleading hero widgets: charts fed by cache without disclosure, inflated “notifications” that duplicate queue depth, or “green” summaries when underlying incidents exist in Super Admin governance views. If a metric is heuristic or sampled, label it.

---

## 4. Operational workflow integration plan

Operational work should trace a **consistent story** from trigger to resolution:

1. **Signal**: events and activity rows (persisted operational activity, platform events—see operational events docs).
2. **Triage**: queue surfaces group and sort by actionable state—never orphaned in a disconnected console.
3. **Context**: a single conceptual **order/customer/console** lineage using shared loaders and timelines (communications timeline builders, webhook activity where relevant).
4. **Action**: mutations go through authenticated admin flows and emit or record operational events where appropriate so Super Admin and analytics stay coherent.

Implementing “integration” is less about one mega-page and more about **shared primitives**: the same identifiers (`OPS_ENTITY_UUID_RE`-style linkage), shared timeline sections, shared status tokens, and **one loader graph** per surface (below).

Workflow documentation for specific domains belongs in **[operational-communications](../operational-communications.md)**, **[operational-events](../operational-events.md)**, **[support-refund-operational](../support-refund-operational.md)**, and **[ses-inbound-operational](../ses-inbound-operational.md)** where messaging intersects inbound mail.

---

## 5. Queue execution UX direction (dense, actionable)

Queue UX should bias **density over storytelling**: operators need many rows visible, statuses at a glance, sort keys that match how work is pulled (age, SLA risk *only when modeled*, blocker flags), and actions that appear **in-row** or in a drawer without navigation churn.

Patterns to prefer:

- Compact tables with zebra legibility and inline badges consistent with `OpsStatusVariant`-style semantics.
- Stable column sets per queue; optional “explain” drawers for outliers.
- One-click escalation only when backed by persisted state—not client-only theatrics.

Avoid dashboard-style cards that summarize what the queue table already proves unless they buy navigation or filtering value.

---

## 6. Shared operational service architecture

Today, Admin pages lean on **`lib/admin/adminConsoleLoaders.ts`** to assemble Prisma-heavy reads for fulfillment, shipping, support, refunds, catering, queues, reporting, notifications, communications, catalog, and the home dashboard. Parallel **ops** routes may load similar concepts via **`lib/operations/orderConsole/loadOperationalOrderConsole`** and related modules.

The consolidation strategy:

- **Treat `lib/operations/**` as the domain layer** for operational truth: events, incidents, timelines, integrations metadata, taxonomy (`OPERATIONAL_EVENT_TYPES`), context links (`operationalContextLinks`), failures, webhook-derived activity—not “ops-only.”
- **Treat `adminConsoleLoaders` (or successors)** as **composition roots** that call into `lib/operations` and `lib/ops/queries` (and Prisma includes) rather than duplicating SQL shapes.
- **Single loader graph per screen**: sibling components should consume one server payload (or narrowly derived selectors) instead of restarting partially overlapping queries via nested client fetches unless there is an explicit UX need.
- **`loadOperationalOrderConsole`** and similar loaders should remain the backbone for rich order-console experiences whether the URL is **`/admin/...`** or transitional **`/ops/...`**; route differences must not multiply data layers.

Governance-heavy readers (failure triage, platform integration runs) intentionally stay closer to Super Admin but should still reuse **`lib/operations`** emitters and types where they describe the same event stream.

For commerce orchestration context, see **[unified-commerce-orchestration](../unified-commerce-orchestration.md)**; for catalog and Square order plumbing, **[SQUARE_ORDERS_ARCHITECTURE](../SQUARE_ORDERS_ARCHITECTURE.md)** and **[ORDER_PERSISTENCE](../ORDER_PERSISTENCE.md)**.

---

## 7. Honest “theater” risk areas in Admin

Some patterns can make Admin *feel* productive without increasing operational certainty. Contributors should watch for:

**Heuristic notifications**: feeds that blend many sources without clear deduplication or severity semantics can train operators to ignore them. Prefer linking each item to authoritative queue rows or timelines.

**Cache-as-inventory**: reporting tiles or dashboards that show cached counts—possibly stale—without timestamps or disclaimers confuse triage during incidents.

**Settings shells**: pages that expose toggles without persistence, validation, integration side effects documented, or error surfacing behave like placeholders. Operators may believe they acted when nothing changed downstream.

Honest labeling, “last refreshed,” deep links into source queues, and feature flags for unfinished sections reduce harm while migration continues.

---

## 8. Recommendations for consolidating Admin / Ops overlap

**Shared modules first:** consolidate domain reads into `lib/operations` (+ shared query helpers such as **`lib/ops/queries`** where they represent business ops, not governance-only views). Thin route modules under **`app/admin`** and **`app/ops`** should differ mostly in layout/permissions, not in query logic.

**Redirects and aliases:** introduce **`/admin/...`** as canonical URLs; **`/ops/...`** should redirect (temporary 302 during migration where semantics are identical) once parity is verified. Document bookmark cutover for internal operators.

**Navigation:** Admin sidebar/nav should enumerate operational execution prominently; Ops nav should shrink to “you are being redirected” or disappear after cutover.

**Components:** **`components/operations/**`** already names shared UI; extend that rather than cloning admin-specific clones for the same timelines and alerts.

Cross-reference Super Admin boundaries in **[super-admin-customer-users](../super-admin-customer-users.md)** when customer directory features overlap governance tooling.

---

## 9. Suggested migration / refactor plan (phases)

**Phase A — parity inventory:** For each `/ops/(console)` page, identify the **`/admin/...`** counterpart (or acknowledge gaps). List loader entry points and deltas.

**Phase B — canonical loaders:** Migrate duplicated Prisma/query blocks so Admin and Ops call the same functions in `lib/operations` / shared query modules; delete divergent forks.

**Phase C — URL consolidation:** Add redirects from `/ops/...` to `/admin/...`; update internal links and emails/documentation that reference Ops URLs.

**Phase D — UX harmonization:** Dashboard truthfulness pass, queue density pass, settings shells either finished or flagged.

**Phase E — deprecation:** Remove Ops-only layouts and auth bifurcation if any exists solely for Ops, once traffic and telemetry show full cutover.

No phase requires claiming completion before redirects and loaders actually match—track with checklists rather than rhetoric.

---

## 10. Recommended implementation order

1. **Loader deduplication** for the highest-traffic crossover (order console, fulfillment/shipping summaries)—fastest ROI, lowers bug drift between surfaces.
2. **Navigation + redirects** once parity passes manual QA on critical workflows (support, refunds, shipments).
3. **Dashboard de-theater** and honest empty states—reduces operator mistrust immediately.
4. **Route renaming** (`order-lookup` → `orders`, harmonized customer subtree) aligned with bookmarks and inbound links—a communications challenge, so stagger after redirects exist.
5. **Ops route removal** when redundant and unmaintained.

---

## Related documentation (cross-links)

| Topic | Document |
|--------|-----------|
| Operational events & incidents pipeline | [`docs/operational-events.md`](../operational-events.md) |
| Operational communications timelines | [`docs/operational-communications.md`](../operational-communications.md) |
| Support & refunds operational behavior | [`docs/support-refund-operational.md`](../support-refund-operational.md) |
| Inbound SES / email operations | [`docs/ses-inbound-operational.md`](../ses-inbound-operational.md) |
| Transactional SES email behavior | [`docs/transactional-email-ses.md`](../transactional-email-ses.md) |
| Unified commerce orchestration | [`docs/unified-commerce-orchestration.md`](../unified-commerce-orchestration.md) |
| Super Admin customer/account governance overlap | [`docs/super-admin-customer-users.md`](../super-admin-customer-users.md) |
| Square orders architecture | [`docs/SQUARE_ORDERS_ARCHITECTURE.md`](../SQUARE_ORDERS_ARCHITECTURE.md) |
| Square orders integration notes | [`docs/SQUARE_ORDERS_INTEGRATION_NOTES.md`](../SQUARE_ORDERS_INTEGRATION_NOTES.md) |
| Order persistence | [`docs/ORDER_PERSISTENCE.md`](../ORDER_PERSISTENCE.md) |
| Square catalog architecture | [`docs/SQUARE_CATALOG_ARCHITECTURE.md`](../SQUARE_CATALOG_ARCHITECTURE.md) |

---

## Summary for contributors

Build **Admin** as the unified operator console; reserve **Super Admin** for governance; **`/ops`** is transitional—**prefer `/admin`**, share **`lib/operations`** and **admin-side loaders**, and refactor toward **one loader graph per page**. Prefer **truthful dashboards**, **dense queues**, and ruthless removal of duplicated ops/admin data paths.
