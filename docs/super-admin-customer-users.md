## Super Admin → Users → Customers

Operational read tooling for diner identities — **not** a CRM.

### Routes

| Path | Purpose |
|------|---------|
| `/super-admin/users/customers` | Searchable roster + grounded badges (`payment_failed`, open incidents, draft/payment combos, bounded orphan webhook hint). Pagination via `page`/`pageSize` query params. Filters: `orders=has_orders\|no_orders`, `activity=stale` (**stale == no `commerce_orders.updated_at` in the freshness window**, see constant in loader). |
| `/super-admin/users/customers/[customerId]` | Dossier merging customer row, ledger-backed impersonation justification, shipments, PaymentRecord rollup, incidents, catering matches, unified timeline helper. Links to Failures inbox with `customerId=` filter plus order-operations. |
| `/super-admin/customer-operations/[customerId]` | **Redirect** → canonical dossier route (legacy bookmarks). |

### Timeline helper

`lib/accountManagement/queryCustomerOperationalTimeline.ts` pulls `OperationalActivityEvent` rows using `buildCustomerOperationalActivityWhere` (metadata `entities.customerId`, legacy `customerId`, actor overlaps, emails) plus `GovernanceAuditEvent` rows targeting the Cognito sub / mailbox / embedded `customerId` metadata.

Canonical lanes cover auth, orders, payments, shipments, impersonation, admin, presence, and related signals by mapping persisted `type` / `actionType` strings onto `OperationalEventTypes` and `PLATFORM_EVENT_SUBTYPE`.

Impersonation start emits both governance and operational rows sharing `metadata.ledgerId`; the helper drops mirrored `presence.impersonation_*` operational duplicates when governance already absorbed the ledger id.

### Impersonation safety

| Item | Detail |
|------|--------|
| TTL | Signed HttpOnly cookie `momos_impersonation` (`IMPERSONATION_COOKIE`) max-age **28 800 s (~8 h)** in `impersonation/start`. |
| Justification | `POST /api/super-admin/impersonation/start` **requires JSON `justification` with length ≥ 10**; persists to **`GovernanceAuditEvent.reason`** and enriches metadata with optional Prisma customer id linkage. Client component `StartCustomerImpersonation` collects this everywhere. |
| Banner | Rendered for super-admin via `SuperAdminLayout` → `belowHeader={<ImpersonationBanner />}`. |

Ledger table columns surface justification text by correlating **`IMPERSONATION_STARTED` governance rows** where `metadata.ledgerId` equals `ImpersonationSupportSession.id`.

### Deferred / stub governance actions

| Action | Status |
|--------|--------|
| `POST /api/super-admin/users/customers/[customerId]/revoke-sessions` | Writes **`CUSTOMER_COGNITO_SESSION_REVOKE_DEFERRED`** (**no IAM / Cognito revocation** invoked). Operators get an append-only breadcrumb pending infra review. |
| Cognito **account disable / hard lockouts** | **Fully deferred** — needs explicit audited helpers in `lib/auth/cognito` plus product policy sign-off prior to exposing destructive UX. |

### Operational failures inbox

`/api/super-admin/operations/failures` already parsed `customerId`; the inbox client preserves entity params (`commerceOrderId`, `customerId`, `paymentRecordId`, `shipmentId`) while operators paginate/filter so dossier deeplinks stay stable.
