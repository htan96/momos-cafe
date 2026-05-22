# Ops App Router → Admin console migration

Execution surfaces that previously lived under **`/ops/(console)/*`** now render from **`/admin/*`** with the same **`getOpsSession` / `opsCan`** permission matrix on API routes. **`/super-admin/**`** remains the elevated workspace (webhook replay, recovery, governance).

## Parity map

| Old `/ops` path | New `/admin` path | Primary APIs | Notes |
| --- | --- | --- | --- |
| `/ops` (Today) | `/admin` + “Live commerce slices” panel | `opsLoadTodayQueues`, `loadAdminHomeDashboard` | Today cards deep-link to orders / comms. |
| `/ops/orders` | `/admin/orders` | `loadAdminCommerceOrdersIndex` (`lib/admin/loadAdminCommerceOrdersIndex.ts`) | Staff orders inbox (placement window + paging; strict visibility for admins). |
| `/ops/orders/[id]` | `/admin/orders/[id]` | `loadOperationalOrderConsole`, `PATCH /api/ops/fulfillment/...`, `POST /api/ops/shipping/purchase-label` | Same `OperationalOrderConsole` as super-admin order ops. |
| `/ops/fulfillment` | `/admin/fulfillment` | `opsLoadFulfillmentBoard`, `loadAdminFulfillmentWorkload`, fulfillment PATCH above | Tabs for pickup · ship · catering + heuristic panels. |
| `/ops/shipping` | `/admin/shipping` | `opsLoadShippingQueue`, `loadAdminShippingContext`, `POST /api/ops/shipping/manual`, purchase-label | Parcel queue + manual `Shipment` form. |
| `/ops/support` | `/admin/support` | Existing admin support loaders | Already canonical. |
| `/ops/communications` | `/admin/communications` | Admin comms loaders | List view unchanged. |
| `/ops/communications/[threadId]` | `/admin/communications/[threadId]` | `opsLoadEmailThread` | Thread UX restored under admin creamsicle styling. |
| `/ops/settings` | `/admin/settings/operations` | `opsLoadSettingsSnapshot` | Read-only catalog / orchestration counters + policy prose. |

## Middleware note (`/api/super-admin`)

**Decision (Option A — 2026-05):** **`/api/super-admin/*`** routes are **not** included in **`middleware.ts` `config.matcher`**; they authenticate in **route handlers** (e.g. **`requireSuperStaffJson`**). **`/super-admin/**`** **pages** still pass the Cognito matcher. Details: **`docs/architecture/production-readiness-remediation-filled-2026-05.md`** §5.3.

## JSON API rename (`/api/ops` vs `/api/admin/ops`)

**Deferred.** `/api/ops/*` stays mounted as-is:

- Middleware + `isCognitoProtectedPath` already special-case **`/api/ops`**; moving handlers to **`/api/admin/ops`** would widen matcher surface (every `/admin` sub-API) or split auth paths.
- Admin RSC pages and client buttons call **`fetch('/api/ops/…', { credentials: 'include' })`** so Cognito cookies flow on same-site staff sessions.

## Shippo fulfillment approval gate

Aligned with choke point **`lib/shipping/runShippoLabelPurchaseForShipment`**:

| Item | Detail |
| --- | --- |
| Prisma columns | **`fulfillmentApprovedAt`** (`timestamptz`), **`fulfillmentApprovedBy`** (`varchar(128)` Cognito sub) on **`FulfillmentGroup`** |
| Migration | **`20260522183000_fulfillment_group_shippo_approval_gate`** |
| Env | **`SHIPPO_REQUIRE_FULFILLMENT_APPROVAL`** — documented in `.env.example` (**default off** unless set to **`true`**) |
| Confirmation action | **`PATCH /api/ops/fulfillment/[groupId]/transition`** with **`{ orderId, action: "confirm_fulfillment" }`** (RETAIL only, idempotent) |
| Telemetry | **`emitOperationalEvent`** type **`fulfillment.approved`** (`OPERATIONAL_EVENT_TYPES.FULFILLMENT_APPROVED`) |
| Label purchase | Returns **`422`** with `fulfillment_not_approved` when gate on and RETAIL group lacks approval; emits **`shipment.label_purchase_blocked`** (`PLATFORM_EVENT_SUBTYPE.SHIPMENT_LABEL_PURCHASE_BLOCKED`) |
| Super-admin break-glass | **`POST/PATCH /api/super-admin/operations/recovery/shippo-label`** passes **`skipFulfillmentApprovalCheck: true`** — audited via existing governance entries |

## Legacy redirects

`next.config.ts` issues **302** responses for bookmarked **`/ops/**`** URLs to the **`/admin/**`** counterparts (see file for exhaustive list).

**Status (2026-05):** The duplicate **`app/ops/**`** App Router tree has been removed; **`/ops`** traffic is redirects-only plus the mappings above.

## Residual grep expectations

References to **`/ops` string** remain for redirect sources and docs. Operational JSON paths **`/api/ops`** remain pervasive by design until a future rename project.
