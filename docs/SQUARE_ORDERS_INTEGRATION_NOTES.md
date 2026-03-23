# Square `orders.create` — payload notes (debugging)

## Logging

- **`SQUARE ORDER PAYLOAD:`** / **`SQUARE ORDER RESPONSE:`** — when `NODE_ENV=development`, `ORDER_DEBUG_LOGS=1`, or **`SQUARE_ORDER_PAYLOAD_LOGS=1`** (server env).  
- Logs include **customer PII** in `fulfillments[].pickupDetails.recipient` — use only in secure environments.

## Root causes addressed in code

### 1. Order shows `COMPLETED` right after payment

- **`payments.create`** uses **`autocomplete: true`**, so the **payment** is captured immediately (intended).
- Square’s **order** state often moves to a terminal state once the order is **fully paid**; that is normal for online checkout.
- Square docs: if **`expires_at`** is **not** set on **pickup** details, behavior when attaching payments can differ. We now set **`expiresAt`** on pickup (after `pickupAt`, within the 7-day cap) so the fulfillment object is **operationally meaningful**.

### 2. Pickup time missing in Square

- The previous payload had **no `fulfillments`**.
- Pickup time belongs on **`fulfillments[].pickupDetails`**: `scheduleType: "SCHEDULED"`, **`pickupAt`** (RFC 3339), plus **`recipient`** (`displayName`, `phoneNumber`, optional `emailAddress`).
- **`pickupAt`** uses the customer’s **`scheduledFor`** when valid; otherwise the server **estimated pickup** (`getEstimatedPickupTime`).

### 3. Modifiers labeled “Modifier 1”, “Modifier 2”

- We only sent **`catalogObjectId`** on each line-item modifier.
- Square’s **`OrderLineItemModifier`** also supports **`name`**. Without it, some UIs fall back to generic labels.
- We now send **`name`** from the cart (same string as the catalog option in your menu), truncated to 255 chars.

### 4. Modifier list IDs

- **`modifierListId`** is stored on **`SelectedModifier`** when adding from the UI (for traceability).  
- The Orders API line-item modifier object does **not** require a separate “list id” field for catalog modifiers; correct **`catalogObjectId`** + **`name`** is the usual fix for display.

## Files

- `lib/squareOrderFromCart.ts` — payload builder (line items, tax, fulfillments, modifier names).
- `app/api/order/route.ts` — pickup time resolution, logging, `orders.create` call.
