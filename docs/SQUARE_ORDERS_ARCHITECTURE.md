# Square Orders vs Payments — Architecture for Momo’s Café

## 1. Current implementation (updated)

| Area | What we do now |
|------|----------------|
| **Catalog** | Menu from **`getMenuFromSquare()`** (`lib/square.ts`) — `catalog.list` + `batchGet`. Each **`MenuItem`** includes **`variationId`** (first `ITEM_VARIATION`) when Square returns it. |
| **Cart** | **`CartItem.variationId`** + modifier option ids (Square **MODIFIER** ids). See `types/ordering.ts`. |
| **Checkout** | If **every** cart line has **`variationId`**: **`client.orders.create()`** with catalog line items + ORDER-scope tax (`lib/squareOrderFromCart.ts`), then **`client.payments.create()`** with **`orderId`** and **`amountMoney`** = Square order total. Otherwise **legacy**: lump-sum **`payments.create()`** only (dashboard may show custom amount). |
| **DB** | **`cafe_orders.square_order_id`** (migration `20250323140000_cafe_orders_square_order.sql`) when Orders API path is used. |

### When the dashboard still shows **“Custom amount”**

- **Legacy path:** cart lines missing **`variationId`** (e.g. old `localStorage` cart, or catalog without variation ids) → payment without **`order_id`**.
- **Orders path:** itemized order + linked payment → Square should show catalog lines and modifiers.

---

## 2. Correct Square model (best practice)

### Payments API

- **Purpose:** Move money — card/wallet → merchant.
- **Inputs:** `source_id` (token), `amount_money`, `location_id`, etc.
- **Does not** define what was sold; optional `note` is free text only.

### Orders API

- **Purpose:** Represent **what** is being sold — line items, modifiers, taxes, discounts, fulfillment.
- **Dashboard:** Itemized orders, kitchen/reporting, linking to catalog.
- **Totals:** Order defines **computed** totals; tax can be modeled with `Order` taxes (e.g. percentage on order scope).

### Linking them (recommended flow)

1. **`orders.create`** — build the basket (catalog or custom line items + taxes).
2. **`payments.create`** — charge the customer, passing **`order_id`** (and usually **`amount_money`** matching the order’s total to pay).

Square docs: [Pay for Orders](https://developer.squareup.com/docs/orders-api/pay-for-orders).

**Rule of thumb:**  
- **Orders API** = truth for **items, modifiers, tax structure**.  
- **Payments API** = **settlement** for that order (or skip if $0).

---

## 3. Target flow (clean)

### Step 1 — Create order (always)

```ts
const { order } = await client.orders.create({
  idempotencyKey: crypto.randomUUID(),
  order: {
    locationId,
    referenceId: cafeOrderId,        // link to your `cafe_orders.id`
    lineItems: [...],                 // from cart → Square line items (below)
    taxes: [...],                     // e.g. 9.25% ORDER scope (if not embedded in line prices)
    // optional: metadata, fulfillments for pickup
  },
});
const squareOrderId = order.id;
const squareTotal = order.totalMoney; // use for payment amount when total > 0
```

### Step 2 — Pay (only if total > 0)

```ts
await client.payments.create({
  sourceId: token,
  orderId: squareOrderId,
  idempotencyKey: crypto.randomUUID(),
  amountMoney: order.totalMoney,     // must match order due total (see Square docs)
  locationId,
  autocomplete: true,
});
```

Use **`order_id`** on the payment so the dashboard shows **payment linked to order** with line detail.

### Step 3 — Free orders ($0)

- **Create the order** with line items priced so **total is $0** (e.g. 100% discount, or $0 custom lines — confirm with Square for your catalog rules), **or**
- **Create order** and **do not** call `payments.create` (order remains **OPEN** / unpaid — acceptable for “comp” tracking if your ops model allows).

Your **`cafe_orders`** row remains the internal source of truth; **`square_order_id`** column (new) links to Square.

---

## 4. Cart → Square line items

Each cart row should map to a **Square `OrderLineItem`** (or equivalent in SDK).

### Each line item should include

| Field | Square / notes |
|--------|----------------|
| **`quantity`** | String in API (e.g. `"2"`). |
| **Identity** | Prefer **`catalogObjectId`** = **ITEM_VARIATION** id from Square Catalog (not ITEM id). |
| **Modifiers** | **`catalogObjectId`** per modifier (MODIFIER catalog objects), or nested structure per API version. |
| **Ad-hoc fallback** | If no catalog match: **`name`** + **`basePriceMoney`** { amount, currency } (custom line). Shows better than a bare payment, but **won’t** sync catalog inventory the same way. |
| **Modifiers (ad-hoc)** | Extra line items or `modifiers` array with catalog ids when available. |

### Your codebase today

- `CartItem.id` is documented as catalog **ITEM** id; Square line items need **variation** id (`catalog_object_id` on the variation).
- Modifiers: `SelectedModifier.id` should be Square **MODIFIER** catalog object ids when using catalog-backed lines.

**Prerequisite for full catalog fidelity:**  
When building the menu from Square, persist **`variationId`** (and modifier catalog ids) on each `CartItem` / modifier so checkout can pass them through unchanged.

### Example (catalog-backed — ideal)

```ts
{
  quantity: String(item.quantity),
  catalogObjectId: item.squareVariationId,
  modifiers: (item.modifiers ?? []).map((m) => ({
    catalogObjectId: m.id,
  })),
}
```

### Example (custom / interim)

```ts
{
  quantity: String(item.quantity),
  name: item.name,
  basePriceMoney: {
    amount: BigInt(Math.round((item.price + modTotal) * 100)),
    currency: "USD",
  },
}
```

Tax can be **ORDER**-scoped tax on the order (e.g. `"9.25"`) instead of baking tax only into `payments.create`’s single amount — aligns dashboard with your 9.25% rate.

---

## 5. Scheduled & internal orders

- **Scheduled:** keep using **`cafe_orders.scheduled_for`** + status; optional Square **fulfillments** / **pickup_details** on the order when you adopt Orders API.
- **Free:** create Square order, skip payment; link `square_order_id` on `cafe_orders`.
- **Paid:** create order → pay with `order_id` → store `square_payment_id` + `square_order_id`.

---

## 6. Implementation checklist (engineering)

1. Add DB columns: `square_order_id`, keep `square_payment_id`.
2. Implement `buildSquareOrderFromCart(cart)` → `CreateOrderRequest` (catalog vs custom strategy).
3. Refactor `/api/order`: `createCafeOrder` → `orders.create` → if `totalCents > 0` then `payments.create({ orderId })`.
4. On failure after `orders.create`: cancel/update order or mark internal status (retry policy).
5. Validate **order total** vs **payment amount** to avoid mismatch errors.

---

## References

- [Orders API — Create order](https://developer.squareup.com/reference/square/orders-api/CreateOrder)
- [Pay for Orders](https://developer.squareup.com/docs/orders-api/pay-for-orders)
- [Payments API — Create payment](https://developer.squareup.com/reference/square/payments-api/CreatePayment) (`order_id` field)
