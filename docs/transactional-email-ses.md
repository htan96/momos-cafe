# Transactional outbound email (Amazon SES)

Staff / system **transactional outbound** (`POST /api/email/send`, notification `deliverOutboundEmail`) routes **only** through **Amazon SES v2** (`@aws-sdk/client-sesv2`). There is **no Resend outbound** branch. Square receipts, Cognito templates, marketing, and similar provider-native flows are unchanged and must not silently assume SES.

**Server-only secrets:** SES and AWS credential env vars are read on the server / Node runtime **only**. Do **not** prefix them with `NEXT_PUBLIC_*` — that would expose them to browser bundles.




## Required runtime contract (`resolveSesOutboundConfig`)

| Variable | Purpose |
|----------|---------|
| **`SES_FROM_EMAIL`** | Verified SES identity for `FromEmailAddress`. |
| **`AWS_REGION`** (preferred) **or `AWS_DEFAULT_REGION`** | SES API region (`resolveAwsRegion` reads `AWS_REGION` first). |
| **Credential chain** | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`, **or** container / Lambda execution role IRSA pairing / instance profile hints (see `hasLikelyResolvableAwsCredentials`). |

Optional:

| Variable | Purpose |
|----------|---------|
| **`SES_REPLY_TO`** | Single reply address for `ReplyToAddresses` when callers omit `replyTo`. |
| **`SES_CONFIGURATION_SET_NAME`** | SESv2 configuration set |
| **`SES_SMOKE_THREAD_ID`** | `EmailThread.id` UUID for internal SES smoke endpoint only. |

Misconfiguration returns **`503`** **`EMAIL_UNCONFIGURED`** from `sendTransactionalOutbound` with JSON **`detail`** set to `ses_from_missing`, `aws_region_missing`, `no_credential_chain_hint`, or `credential_env_asymmetric_hint` (thin heuristic — not IAM proof).


## Deprecated / inbound-only vars

| Var | Notes |
|-----|--------|
| **`EMAIL_TRANSPORT`** | Deprecated — outbound was SES-only; remove from env drift. |
| **`RESEND_API_KEY`** | Deprecated/unused — no outbound consumer. |
| **`RESEND_FROM_EMAIL`** | Deprecated — was Resend outbound `from`; inbound does **not** read it. |

## Inbound (unchanged)



Inbound mail stays on **`POST /api/email/inbound`** with **`RESEND_WEBHOOK_SECRET`** and Svix signatures (`verifyResendInbound`). This does **not** require `RESEND_API_KEY`.



Integration health (**`checkEmail`**): primary signal is SES **`GetAccount`** when region + credential **heuristic** succeeds. Metadata includes **`resendInboundConfigured`** when `RESEND_WEBHOOK_SECRET` is set (_inbound_ capability only).

### Notification outbox bridging

`skeletonNotificationProcessor` delegates types prefixed with `email.transactional.` to **`deliverOutboundEmail`**, which calls **`sendTransactionalOutbound`** directly — no internal `fetch` hop.

### `NotificationEvent` lifecycle (outbox worker)

Lease column **`started_processing_at`** guards single-flight delivery when multiple workers scan the same backlog.

| Logical state | Persistence |
|---------------|-------------|
| **pending** | `processed_at` null; row claimable (`started_processing_at` null **or** older than ~15 min). |
| **processing** | `started_processing_at` freshly set (`UPDATE …` + row match — stale lease recovery clears locks first). |
| **sent** | `processed_at` set; **`provider_message_id`** echoed on payload / `_process` after successful SES. |
| **failed** | Terminal **`processed_at`** with `_process.last_error` — attempts capped (**≤ 5**) via `_process.attempts` / `_process.delivery_attempt`. |

Stuck leases: **`started_processing_at` > ~15 min** while **`processed_at` null** ⇒ lease cleared (`NULL`) at the start of each `processNotificationOutbox` sweep for retry.

### Idempotency

- **`EmailMessage.idempotencyKey`** (`UNIQUE`): repeat callers hydrate the stored **`EmailMessage`** and skip SES (including races surfaced as **`P2002`**).
- Automated outbox email uses **`notif-{notificationEvent.uuid}:attempt-{n}`**.

## Internal SES operational endpoints (`INTERNAL_API_SECRET`)

These routes inherit the **`INTERNAL_API_SECRET`** middleware matcher; handlers also call **`verifyInternalSecretFromRequest`** for parity with cron routes.


| Endpoint | Behaviour |
|-----------|-----------|
| **`POST /api/internal/email/ses-smoke-send`** | Body `{ "to": "mailbox@domain" }`. Requires full SES readiness + **`SES_SMOKE_THREAD_ID`**. Sends minimal HTML (**“SES smoke OK”**). |
| **`POST /api/internal/webhooks/ses-notification`** | Stub: fingerprints raw body (**SHA-256 hex**) → **`system.email.bounce_stub_received`**. **`TODO SNS cert verification`** before subscribing production topics. |

## Rollout backlog (priorities)

**10.** Grooming checkpoints for SES ownership:

**B.** SES production readiness: sandbox exit, domain + DKIM alignment, SNS bounce / complaint ingestion.



**C.** Decide whether inbound should remain Resend-routed indefinitely or introduce AWS Receipt Rule fan-out alongside `/api/email/inbound`.



**D.** Operationalise configuration sets (`SES_CONFIGURATION_SET_NAME`) for alerting.



## Manual validation checklist (operator)



### Staging / DB

1. Apply migration **`20260521204500_notification_outbound_email_hardening`** (**`pnpm prisma migrate deploy`**) prior to rollout.
2. **`POST /api/internal/email/ses-smoke-send`** (`Authorization: Bearer <INTERNAL_API_SECRET>`) with **`{ "to": "you@staging-domain" }`** — confirm HTTP **200**, SES **`providerMessageId`**, and **`email_messages.provider_message_id`** populated.


### Telemetry / stubs

3. **`POST /api/internal/webhooks/ses-notification`** with `{}` twice — **`system.email.bounce_stub_received`** differs only by **`payload_hash_sha256_hex`** until payloads carry structured bounce types.


### Inbox legitimacy (manual)

4. **Gmail** → open message → **Show original** → **DKIM = PASS**, **spf=pass**, aligned **`From`** / **`Return-Path`** (DMARC aggregates reviewed separately).


5. **Outlook / Microsoft 365** → **Internet message headers** / **Authentication-Results**: DKIM + SPF pass per Microsoft’s header format.


6. **Apple Mail / iCloud**: **Show all headers** (macOS **`⌘⇧H`**) → same DKIM / SPF sanity checks.



### SNS later

7. SES configuration-set → SNS topic → HTTPS subscribe this URL **after** SNS signature verification lands — see handler **TODO**.



Production checklist before relying on SES:

1. Move the SES identity out of **sandbox** (`SendQuota`).

2. **Verify** sending domain/`From` identity aligned with DKIM publishing.

3. Attach **configuration set** monitoring if reputational alerting is mandated.

4. Exercise `POST /api/email/send` in staging.



Operational caveats:



- Sandbox mode only delivers to verified destinations.

- Bounces/complaints belong in SNS/EventBridge outside this emitter.

