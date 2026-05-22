# Operational support & refund orchestration

This document anchors the **Momos ops desk MVP** (`OperationalSupportIssue`, `OperationalRefundCase`): Momos persists coordination, emits `emitPlatformEvent` + `recordGovernanceAuditEntry`, while **Square stays the financial ledger** — capture, refund disposition, settlements, disputes, acquirer truth.

## Ownership boundaries

- **Momos** — Lightweight issue/refund workflows, approvals, linkage to commerce shells (`CommerceOrder`), staff attribution (`requestedByStaffSub`, `approvedByStaffSub`), internal notes surfaced only behind ops/super-admin auth, deterministic event taxonomy (`support.issue_*`, `refund.case_*`), webhook reconciliation stubs on top of Postgres rows.
- **Square** — Authoritative PSP state. Our `OperationalRefundCase` statuses track orchestration shells (`SUBMITTED_TO_SQUARE`, `SQUARE_COMPLETED`, …) but **never** pretend to ledger money. When Square denies a refund (`REFUND_CASE_FAILED` / HTTP 502 responses), Momos persists `SQUARE_FAILED` and emits loudly — refunds never silently succeed.
- **Explicit non-goals** — No PSA / SLA ticketing, no accounting subsystem or double-entry bookkeeping, no customer self-service portals in this MVP.

## Prisma artifacts

Migration `20260521195500_operational_support_refund_mvp` introduces UTF-8 `TEXT` payloads with enums mapped to Postgres `OPERATIONAL*` types:

- **`operational_support_issues`** (`OperationalSupportIssue`) — optional correlations (`customer`, `commerceOrder`, `shipment`, `cateringInquiry`) plus immutable staff subs for provenance/resolution journaling.
- **`operational_refund_cases`** (`OperationalRefundCase`) — requires `commerceOrderId`, optionally references `OperationalSupportIssue` & `PaymentRecord`, stores orchestration intents (`amountCents` nullable ⇒ default to PaymentRecord totals at Square invocation), eventual `squareRefundId`.

Indexes exist on `{ commerceOrderId, status }` for both tables to satisfy hot console queries.

## API surface (`/api/ops/*`)

| Method & path | Purpose |
| ------------- | ------- |
| `GET /api/ops/support/issues?commerceOrderId=<uuid>` | List issues anchored to one commerce shell. |
| `POST /api/ops/support/issues` | Create issue (+ governance + `support.issue_created`). |
| `PATCH /api/ops/support/issues/[cuid]` | Status / structured notes (+ `support.issue_updated`). |
| `GET /api/ops/refunds/cases?commerceOrderId=<uuid>` | Hydrate coordination rows + payment stubs. |
| `POST /api/ops/refunds/cases` | Register intent (`REQUESTED`). |
| `PATCH /api/ops/refunds/cases/[cuid]` | Lifecycle transitions — `APPROVED` stamps `approvedByStaffSub`; `SUBMITTED_TO_SQUARE` calls `SquareClient.refunds.refundPayment`.

All routes reuse `getOpsSession` Cognito admins and require **`support:write`** (default **admin**/fulfillment/support matrix entries include it while `read_only` does **not**).

## Square & webhook prerequisites

Minimal env alignment with checkout:

```
SQUARE_ACCESS_TOKEN=XXXXXXXX
SQUARE_ENVIRONMENT=sandbox # or production — must match PSP rows you refund
```

Webhook route `POST app/api/webhooks/square` now merges refund notifications with payment notifications for receipt linkage and calls `reconcileOperationalRefundCaseFromSquareWebhook` when `extractSquareRefundWebhookEnvelope` recognizes `refund.*` / `payment.refund.*` envelopes (signature verified beforehand).

Operational UI lives on `/ops/orders/[id]` (**Support / Refund** panels) plus optional backlog `/ops/support`.

## Platform & governance emits

Representative taxonomy strings now live beside existing entries in `lib/platform/events/taxonomy.ts`:

| Subtype | Typical lifecycle |
| ------- | ----------------- |
| `support.issue_created` | `started` |
| `support.issue_updated` | `processing` |
| `refund.case_requested` | `started` |
| `refund.case_reviewing` | `processing` |
| `refund.case_approved` | `processing` |
| `refund.case_denied` | `cancelled` |
| `refund.case_submitted_to_square` | `processing` / `succeeded` |
| `refund.case_square_completed` | `succeeded` |
| `refund.case_square_failed` | `failed` |
| `refund.case_failed` | `failed` |

Governance audit verbs **`OPERATIONAL_SUPPORT_ISSUE_UPDATED`** / **`OPERATIONAL_REFUND_CASE_UPDATED`** annotate every persisted mutation touching the desks.

## Data loading on the unified console

`loadOperationalOrderConsole` now hydrates **`supportIssues`** + **`refundCases`** snapshots so SSR paints the grids without noisy client effects — follow-up PATCH/POST handlers still REST back through `/api/ops/*`.

## Operational checklists before go-live

1. Run `pnpm prisma migrate deploy` (or `pnpm db:migrate`) against Postgres **UTF‑8** databases only.
2. Immediately follow with **`pnpm prisma generate`** on every workstation/CI runner so `@prisma/client` matches enums + delegates.
3. Configure Square refund webhooks to the existing notification URL bundle (`SQUARE_WEBHOOK_SIGNATURE_KEY`, `SQUARE_WEBHOOK_NOTIFICATION_URL`).
4. Issue a staged refund via **REQUESTED → REVIEWING → APPROVED → SUBMITTED\_TO\_SQUARE** and confirm webhook logs promote `SUBMITTED_TO_SQUARE → SQUARE_COMPLETED`.
5. Prove failure handling by revoking/refusing a Sandbox payment idempotently — expect HTTP 502/503 from our PATCH plus `REFUND_CASE_FAILED` telemetry.

## Known gaps / follow-ups

- Webhook parsers are resilient but **best-effort** — if Square materially changes casing or nesting (`data.object.paymentRefund`), extend `peekSquareRefundFromWebhook.ts` promptly.
- `submitOperationalRefundToSquare` presently charges refunds with Square `currency: "USD"`; multi-currency ledgers must thread `payment_records.currency` into the SDK deliberately.
- No automated reconciliation job polls `squareRefundId`; terminal states rely on webhooks plus synchronous COMPLETED payloads.
- `read_only` ops roles deliberately lack `support:write` until RBAC granularity hardens.

