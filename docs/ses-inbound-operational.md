## SES operational inbound — Momos Café

Operational mail (staff mailboxes plus `reply+<thread-token>@`) is ingested via **`POST /api/email/inbound-ses`** (public HTTPS endpoint for **Amazon SNS**). Transactional outbound remains **SES only** (`sendTransactionalOutbound`); threading uses custom **`Message-ID`** headers and **`reply+{token}`** Reply-To routing.

### Receipt rule sketch (minimal)

**SES receive** → receipt rule actions:

1. **SNS notify** publishing the **received message** notification (JSON envelope with `notificationType: "Received"`).

2. **Important:** SNS must carry **either**:
   - a base64-encoded raw MIME payload (`content`), **or**
   - Phase-2: S3 object + application-side fetch (**not shipped** yet — Momos replies **501** and emits **`system.email.inbound_failed`**).

Prefer an SNS-first rule that publishes the **same JSON structure AWS documents for inbound receive**, including inlined `content` when available. Receipt rules configured with **S3-only** storage require hydration work (planned).

HTTPS subscription URL: **`https://<your-host>/api/email/inbound-ses`** (exact production/staging hostname). Middleware **does not** gate this path (`INTERNAL_API_SECRET` is SNS signature OR forwarder Bearer only).

---

### Required environment variables

| Variable | Purpose |
| :--- | :--- |
| `SES_INBOUND_SNS_TOPIC_ARN` | Strict allow-list for SNS payloads — **`TopicArn` must match exactly** after signature verification. |
| `SES_INBOUND_REPLY_DOMAIN` | Apex used for **`reply+<token>@...`** recipients and **`support@`** / **`catering@`** matching. Falls back to the domain suffix of **`SES_FROM_EMAIL`** when unset. |

Optional knobs:

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `SES_OPS_SUPPORT_LOCALPART` | `support` | Recognized shared mailbox prefix. |
| `SES_OPS_CATERING_LOCALPART` | `catering` | Recognized catering mailbox prefix. |
| `SES_OPS_INBOUND_RL_PER_SENDER_DAY` | `400` | Per-sender (From) inbound cap (24 h sliding window via `rateLimitHit`). |

---

### Security model

**SNS path**

Messages are authenticated by **certificate-backed RSA signatures** (`SignatureVersion` 1 ⇒ SHA1, 2 ⇒ SHA256). Signing certificates are fetched only from **`https://sns.<region>.amazonaws.com/…`** URLs.

Replay protection compares `Timestamp` to server time (±60 minutes guard band).

Subscription handshakes (**`SubscriptionConfirmation`**) verify first, then the handler issues an HTTPS **`GET`** to `SubscribeURL` (same SNS hostname allow-list).

Before processing content, **`TopicArn`** must equal **`SES_INBOUND_SNS_TOPIC_ARN`**. Omitting `SES_INBOUND_SNS_TOPIC_ARN` returns HTTP **503** (`sns_inbound_unconfigured`) so misconfigured installs never blindly trust arbitrary topics.

---

### Persistence & threading

Unified persistence: **`ingestOperationalInboundEmail`** (`lib/email/ingestOperationalInboundEmail.ts`):

- SES transports (`ses_sns`, `ses_forwarder`) discard mail whose recipients never match **`support@`** / **`catering@`** / **`reply+*@`** on `SES_INBOUND_REPLY_DOMAIN`.

- Threads resolve via:
  - `EmailThread.providerThreadKey` **only when outbound already persisted the token**, or
  - `In-Reply-To` / `References` correlations against **`EmailMessage.rfc_message_id`** on **`direction = outbound`** rows.

- Duplicate protection: SES uses `mail.messageId` as `provider_message_id`; RFC `Message-ID` also dedupes inbound rows.

- Quarantine heuristic (lightweight abuse flag): persists `momosOperational: { quarantine: true, reason, transport }` inside `EmailMessage.raw_payload` JSON for ops tooling.

Resend webhook (`POST /api/email/inbound`) still calls **`persistInboundEmailEvent`**, which delegates into the shared ingest helper (`transport: resend`, **without** SES recipient filtering).

Outbound threading: **`ensureSesThreadReplyRouting`** provisions `provider_thread_key`, sets SES **`Message-ID`** as a Simple-message header (`sendEmailViaSes`), and derives Reply-To **`reply+<token>@<domain>`** unless callers override **`replyTo`** / **`SES_REPLY_TO`** precedence defined in source.

Platform events emitted on success align with taxonomy:

| Event | Meaning |
| :--- | :--- |
| `system.email.inbound_received` | Successful ingest (any transport). |
| `system.email.inbound_failed` | Misconfiguration (`topic` missing / S3-only body). |
| `security.webhook.signature_invalid` | SNS signature verification failures. |

---

### Internal JSON forwarder (dual path contract)

Authenticate with Bearer **`INTERNAL_API_SECRET`** (`verifyInternalSecretFromRequest` parity).

```jsonc
POST /api/email/inbound-ses
Authorization: Bearer <INTERNAL_API_SECRET>
Content-Type: application/json

{
  "from": "customer@example.com",
  "to": ["reply+YOUR_THREAD_TOKEN@momo-domain.com"],
  "subject": "Re: Catering",
  "text": "Plain body",
  "html": "<p>Optional html</p>",
  "sesMessageId": "<AWS internal SES message id>",
  "rfcMessageId": "<...@momos-domain.com>",
  "inReplyTo": "<...@ses.amazonaws.com>",
  "references": "<...@...>",
  "receivedAt": "2026-05-21T21:43:02.000Z"
}
```

Legacy field **`messageId`** still maps to the RFC **`Message-ID`** whenever `rfcMessageId` is omitted.

⚠️ **Do not bundle AWS SNS fields (`SigningCertURL`, `Signature`, …) with the Bearer path** — the handler treats authenticated SNS envelopes separately before checking your secret.
