# Square webhook signature verification

Production ingress is `POST /api/webhooks/square` (Next.js App Router). Verification logic and pitfalls live in **`lib/webhooks/square/verifySquareWebhookSignature.ts`** (canonical implementation).

**Square’s documented validation:** [Verify and validate an event notification](https://developer.squareup.com/docs/webhooks/step3validate)

- Header: **`x-square-hmacsha256-signature`** (HTTP header names are case-insensitive).
- MAC: Base64-encoded **HMAC-SHA256**, key = subscription **signature key**, message = **`notificationUrl + raw body`** as UTF-8 (exact bytes Square POSTed).

**Express (standalone)** teams should use **`express.raw({ type: 'application/json' })`** (or equivalent) on the webhook route **before** any `express.json()`, then verify on `buf.toString('utf8')`, then `JSON.parse`. Examples are in comments on that library file.

**Environment:**

- **`SQUARE_WEBHOOK_SIGNATURE_KEY`** — Signature key from the **same webhook subscription** in the Developer Dashboard as the ingress URL (Sandbox vs Production must match subscription).
- **`SQUARE_WEBHOOK_NOTIFICATION_URL`** — Must equal the subscription **Notification URL** exactly (`https`, path, trailing slash, etc.) — this string is prefixed to the raw body for signing.
