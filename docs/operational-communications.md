# Operational communications & notifications MVP

This note defines **Momos-internal** coordination — not CRM or marketing inbox. We persist internal notes, stitch email-thread rows already in Postgres, correlate bounded notification-queue reads, and show SES/SendWebhook receipts when they carry `commerce_order_id`.

## Architectural boundaries

- **Square** sends buyer-facing transactional mail (payments, PSP receipts). Those payloads are authoritative for money movement narratives; Momos timelines link out to Square consoles where needed.
- **Momos SES (application)** is the storefront-owned channel for scaffolding in `lib/email/templates/transactionalStubs.ts` and future `deliverOutboundEmail` paths. SES inbound plus-addressing and mailbox aliases live in `lib/email/inboundOperationalEnv.ts`.
- **`NotificationEvent`** remains an append-only orchestration ledger. This MVP adds **read-only merging** (`email.*` / `commerce.*` types from the past 90 days) when a bounded helper finds the commerce order id inside the payload.
- **SMS** is catalogued as planned only (`docs` + `/super-admin/platform/communication-registry`); no Twilio wiring exists in-repo.

## Inbound surfaces

| Path | Transport | Persistence |
| --- | --- | --- |
| Resend webhook (`/api/email/inbound`) | HTTPS JSON | `EmailThread`/`EmailMessage` + optional `WebhookDeliveryReceipt` (`provider: resend`) |
| SES operational recipients (`reply+<token>@…`, `support@…`, `catering@…` on SES inbound domain) | SES → ingestion | Threads/messages enriched with `momosOperational` payloads where applicable |

## Schema

- **`operational_communication_notes`** — `OperationalCommunicationNote` with XOR `commerce_order_id`/`customer_id`, optional FK to `operational_support_issues`, enums `OperationalCommunicationNoteKind`/`OperationalCommunicationNoteVisibility`.

## API (ops JWT)

- **`POST /api/ops/communications/notes`** — create note (`communications:write` _or_ `support:write`). Emits **`communication.internal_note_added`** via `emitPlatformEvent` and governance **`OPERATIONAL_COMMUNICATION_NOTE_CREATED`**.
- **`GET /api/ops/communications/timeline?commerceOrderId=<uuid>`** — merged chronological rail (`console:read`).

## Unified order console loader

`loadOperationalOrderConsole` now includes **`communicationTimeline`** precomputed server-side (avoid client waterfall).

## Governance registry UI

`/super-admin/platform/communication-registry` lists static rows built from stubs, workflows, SES env docs, PSP ownership, and SMS planned stub.
