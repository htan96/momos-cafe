# Order persistence (`cafe_orders`) vs Square-only checkout

## Why the code uses `cafe_orders`

The app was built to:

1. **Save each checkout** in **your** database (`cafe_orders`) — cart JSON, customer, totals, status (`awaiting_payment` → `paid`), links to Square.
2. **Charge the customer** with Square (`payments.create`, optionally after `orders.create`).

So **Square** = money + (when configured) itemized catalog order. **Supabase** = your copy for pickup lists, support, admin, analytics.

You only use **Supabase for the menu** (`menucategories`, etc.) today — that’s fine. The order API still *tried* to insert into `cafe_orders`, which caused **503** when that table didn’t exist.

## Current behavior

| Situation | What happens |
|-----------|----------------|
| **`cafe_orders` exists** | Row created → payment → `markCafeOrderPaid` updates the row. |
| **Table missing** (e.g. `PGRST205`, “schema cache”) | **Automatic fallback:** no DB row, random UUID as `orderId`, **Square payment still runs**. Response may include `persistedToDatabase: false`. |
| **`SKIP_CAFE_ORDER_PERSIST=true`** (or `1`) | Same as above, without trying Supabase first. |

## If you want orders in the database

Run the migrations in `supabase/migrations/` on your Supabase project (at least the one that creates `cafe_orders`, and `square_order_id` if you use Square Orders API).

## If you only want Square (no order table)

- Do nothing extra — missing table is detected and checkout continues; or  
- Set **`SKIP_CAFE_ORDER_PERSIST=true`** on the server so the API never attempts an insert (slightly cleaner logs).

---

## Payment verification (default on)

After `payments.create`, the API calls **`GET /v2/payments/{id}`** and checks:

- Status is **`COMPLETED`** or **`APPROVED`**
- **Amount** matches what we charged (when Square returns `amountMoney`)

Only then does it return **`success: true`** with **`paymentVerified: true`**. The confirmation screen shows **“Payment confirmed with Square”** plus status / payment reference.

If verification fails, the client gets **502** with `squarePaymentId` so you can look it up in the Square Dashboard (a charge may still exist).

To turn this off (e.g. emergency): **`SKIP_PAYMENT_VERIFICATION=true`** on the server.
