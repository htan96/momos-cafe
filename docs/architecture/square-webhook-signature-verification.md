# Square webhook signature verification

Production ingress is `POST /api/webhooks/square` (Next.js App Router). Verification logic and pitfalls live in **`lib/webhooks/square/verifySquareWebhookSignature.ts`** (canonical implementation).

**Square’s documented validation:** [Verify and validate an event notification](https://developer.squareup.com/docs/webhooks/step3validate)

- Header: **`x-square-hmacsha256-signature`** (HTTP header names are case-insensitive).
- MAC: Base64-encoded **HMAC-SHA256**, key = subscription **signature key**, message = **`notificationUrl + raw body`** as UTF-8 (exact bytes Square POSTed).

**Express (standalone)** teams should use **`express.raw({ type: 'application/json' })`** (or equivalent) on the webhook route **before** any `express.json()`, then verify on `buf.toString('utf8')`, then `JSON.parse`. Examples are in comments on that library file.

**Environment:**

- **`SQUARE_WEBHOOK_SIGNATURE_KEY`** — Signature key from the **same webhook subscription** in the Developer Dashboard as the ingress URL (Sandbox vs Production must match subscription).
- **`SQUARE_WEBHOOK_NOTIFICATION_URL`** — Must equal the subscription **Notification URL** exactly (`https`, path, trailing slash, etc.) — this string is prefixed to the raw body for signing.

---

## Appendix: Troubleshooting checklist (operators)

Use this order when **`401 invalid_signature`** or Super Admin Failures rows with **`security.webhook.signature_invalid`** appear.

### 1. Confirm env matches the Dashboard subscription

| Check | Details |
| --- | --- |
| **Sandbox vs Production** | `SQUARE_ENVIRONMENT` and webhook subscription must agree. Sandbox keys do not verify Production deliveries (and vice versa). Copy the signature key from **the subscription that owns this Notification URL**, not another app credential. |
| **`SQUARE_WEBHOOK_SIGNATURE_KEY`** | Dashboard → Applications → Webhooks → **Subscription** signature key (**not** the general application secret unless Square documents otherwise for your flow). Prefer paste from console to avoid typo. |
| **`SQUARE_WEBHOOK_NOTIFICATION_URL`** | Must match subscription **Notification URL** **byte-for-byte**: scheme (`https://`), hostname, path (e.g. `/api/webhooks/square`), and **whether the console shows a trailing slash**. A missing or extra slash breaks HMAC. Compare to Vercel’s **exact deployed URL** (no staging alias mismatch). |

### 2. Confirm ingress sees Square’s raw body

Signing input is **`UTF-8(notificationUrl + raw POST body)`**. Any handler that parses JSON before verification will break verification (re-serialized JSON ≠ original bytes).

- This route uses **`await req.text()`** before **`JSON.parse`** — correct pattern for Next.js App Router (`app/api/webhooks/square/route.ts`).
- Do not add **`middleware`/rewrites that consume the body** for this path, and do not enable body transforming proxies that normalize JSON.

### 3. Confirm header and crypto shape

- Incoming header **`x-square-hmacsha256-signature`** — Base64-encoded HMAC-SHA256 (decoded and compared with **`timingSafeEqual`** in **`lib/webhooks/square/verifySquareWebhookSignature.ts`**).
- If the signature header is absent or malformed, verification fails immediately (check provider/replay tooling).

### 4. Operational signals (Failures inbox noise)

Each failed verification attempt calls **`emitPlatformEvent`** → a new **`OperationalActivityEvent`** row. Square retries the same notification — **distinct inbox rows share the same `event_id`/receipt row when retries hit the same JSON** (delivery receipt keyed by **`event_id`**). That is provider-driven retry telemetry, not a React list bug.

Suggested triage framing (does not imply suppressing instrumentation):

- **Group mentally** by **`squareEventId`** (now in **`metadata.detail.squareEventId`**) plus short time buckets.
- Optionally filter Super Admin Failures by subtype **`security.webhook.signature_invalid`** (inbox subtype chip).

### 5. Linked incidents (**`WEBHOOK_FAILURE_LOOP`**)

**`SECURITY_WEBHOOK_SIGNATURE_INVALID`** is included in webhook failure spike detection (**`lib/operations/incidentDetection.ts`**, 3‑minute sliding window against multiple webhook failure types). Many retries in short succession can legitimately correlate with **`WEBHOOK_FAILURE_LOOP`** even when payloads repeat.

See server logs **`[webhooks/square POST] Square webhook signature verify failed`** for sanitized hints (`signingNotificationUrlExact`, header preview, **`rawBodyUtf8Length`**).
