## Unified commerce orchestration (checkout correlation)

Rolling assumption: Square remains the PSP; Momos persists **`CommerceOrder` + `FulfillmentGroup`s + `PaymentRecord`** and reconciles **`payment.updated`** envelopes.

### Checkout flow (today)

1. **Draft** — Browser calls `POST /api/orders` with unified cart lines. Server creates **`CommerceOrder` rows + `FulfillmentGroup`s**, sets `CommerceOrder.totalCents` from line totals (shipping added at charge time). Emits operational **`order.created`**.
2. **Register pending payment** — `POST /api/order` aligns `commerce_orders.total_cents` to the payable Square total, then idempotently creates a **`payment_records`** row via `registerPendingCommercePayment` keyed by **`sha256`**(`commerce-order-id`:`checkout-attempt-id`). Emits **`payment.pending_registered`** (and notification `commerce.payment.pending_registered`).
3. **Charge** — Square **`payments.create`** uses `reference_id` = **`payment_records.id`** so webhooks correlate even before `square_payment_id` lands.
4. **Post-charge** — Legacy **`cafe_orders`** insert remains. `reconcileCommerceOrderAfterStorefrontPayment` advances **`CommerceOrder`** → paid; **`payment.succeeded`** is emitted from Square webhook reconcile when the payment terminalizes.

### Operator truth table

| Signal | Meaning |
|--------|--------|
| `order.created` | Draft commerce shell + partition groups written from storefront cart. |
| `payment.pending_registered` | `PaymentRecord` pending shell exists; Square charge may still be in flight. |
| `commerce.payment.square_webhook` (notification) | Signed payment webhook observed; row updates ran or skipped as idempotent. |
| `payment.succeeded` (ops) | Webhook path confirmed completed / approved → order may advance to `paid`. |
| `payment.square.orphan_webhook` (platform) | Webhook could not match a `PaymentRecord` (reference / id mismatch). |

### Rollout toggles

- **`UNIFIED_COMMERCE_CHECKOUT`** — Set to `0`, `false`, or `off` to disable requiring a draft `CommerceOrder` and to skip the pre-charge `PaymentRecord` register on legacy `POST /api/order` (useful for non-storefront API clients). **Default: enabled** when unset.

### Schema hints

- **`CommerceOrder.source`** — Optional provenance (e.g. `storefront` on cart-originated drafts).
- **`CommerceOrder.fulfillmentMode`** — `MIXED` \| `EXTERNAL_KITCHEN_ONLY` \| `NATIVE_RETAIL_ONLY` from line kinds at draft time.

### Retail ship label purchase

After a successful Shippo label buy, the parent **retail** `FulfillmentGroup` is advanced toward **`shipped`** with validated lifecycle edges.
