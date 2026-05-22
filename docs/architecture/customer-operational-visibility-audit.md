# Customer operational visibility — emission audit

This note summarizes where `emitOperationalEvent` / `emitPlatformEvent` run for **money, fulfillment, shipping, support/refunds, and email**, versus the dotted taxonomy targets (`order.*`, `payment.*`, `fulfillment.*`, `shipment.*`, `support.*`, `refund.*`).

## Call sites inspected (grep)

| Area | Location | Persisted backbone | Gap / notes |
|------|-----------|---------------------|--------------|
| **Order / payment pending** | `registerPendingCommercePayment` | `payment.pending_registered` + `commerce.payment.pending_registered` NotificationEvent | Covered. |
| **Square webhook terminal** | `reconcileSquarePaymentWebhook` → `emitPaymentTerminalEvent` | `payment.succeeded` / `payment.failed`; orphan → `payment.square.orphan_webhook` | Covered; uses `commerceOrderId` in metadata/`entities`. |
| **Unified storefront checkout (legacy `/api/order`)** | Previously reconcile only — **gap** vs customer timeline | **`payment.succeeded`** after successful reconcile when `PaymentRecord` first reaches `completed` (`api.order`), deduped with webhook | Webhook skips emit if already `completed`. |
| **Fulfillment PATCH** | `app/api/ops/fulfillment/...`, `app/api/orders/...` | **`fulfillment.group_status_changed`** (added) | Auto retail promotion after label purchase **does not yet** emit separate rows (defer). |
| **Shippo label purchase** | `runShippoLabelPurchaseForShipment` | `shipment.label_created` + platform `shipment.label_failed` | **Enriched**: `commerceOrderId` / `entities` on label success. Fail path still shipment-scoped only. |
| **Shippo reconcile** | `reconcileShippoWebhook` | `shipment.tracking_updated` lifecycle subtypes | `entities.shipmentId` + `commerceOrderId`. Orphan webhook rows excluded from customer allow-list. |
| **Refund PATCH** | `app/api/ops/refunds/cases/[id]` | `refund.case_*` | Covered. |
| **Support PATCH/create** | `app/api/ops/support/issues*` | `support.issue_created` / `support.issue_updated` | Covered (`entities.commerceOrderId` when set). |
| **Email outbound failures** | `sendTransactionalOutbound` | `system.email.*` | **Customer allow-list excludes** noisy system subtypes — rely on `EmailThread` / `EmailMessage` for successful correspondence. |

## Customer detail graph

Implemented in:

- `lib/account/loadCustomerOperationalOrderDetail.ts` — single Prisma graph + scoped activity rows.
- `lib/account/loadCustomerOrderCommunications.ts` — email excerpts + **`CUSTOMER_VISIBLE`** notes only.
- `lib/account/customerOrderOperationalPresentation.ts` — allow-listed `OperationalActivityEvent.type` slice + shipment-scoped derivation from real rows only.

## Deferred (Phase 6 / follow-through)

1. **`/account/notifications`**: Not linked from `ACCOUNT_PLATFORM_NAV`; **skipped** (optional scope).
2. **Admin/order console reuse** of the same loader behind ops auth — cheap next step.
3. **`promoteRetailGroupAfterShipmentLabel`** persists transitions without emitting **`fulfillment.group_status_changed`** per step.
4. **Elasticsearch / aggregate search**: out of scope (`NO enterprise ES`).
5. **Separate customer milestone ledger**: none added; reuse `OperationalActivityEvent` metadata + enums.
