# Notifications, webhook replay, backlog, misuse

See [operational-events.md](../operational-events.md) for outbox cron mention and **`NotificationEvent`** role. SES lifecycle: [transactional-email-ses.md](../transactional-email-ses.md).

---

## 3 — Notification dead-letter / Phase B rewind

**Detection signals**

- **`/super-admin/operations/notifications-health`**: attempt-cap terminals (“dead-letter”), `_process.attempts` at cap in UI copy / lifecycle helper.
- CS: missing transactional email while order otherwise succeeded.

**Severity**

- **WARNING** single row — **HIGH** when many terminals or revenue-critical sends.

**Operational impact**

- Broken receipts, password/resets, fulfillment comms depending on **`notification_events` type**.

**Immediate containment**

- Fix SES/AWS first if systemic (see SES runbook) — rewind duplicates risk.

**Investigation**

- Inspect row payload / **`_process.last_error`** / **`provider_message_id`** presence (might have sent despite **`processed_at`** terminal).

**Recovery**

- **`POST /api/super-admin/operations/notification-events/{id}/operator-requeue`** (JSON body per UI / route):
  - **Phase A:** default POST clears stale lease when **`processed_at` null**; **`confirmRequeueStaleLease: true`** detaches a **fresh** lease (dangerous — confirm checkbox in notifications-health client).
  - **Phase B:** **`dangerConfirmResetDeadLetter: true`** — **can duplicate SES sends** per route comment.

**Escalation**

- Phase B on types that triggered customer-visible duplicate (legal/comms review).

**Do not**

- Use Phase B as first retry — prefer healthy cron draining **`lease`** backlogs first.

**Audit / replay**

- Operator routes record governance audit paths; **`/api/internal/cron/notification-outbox`** clears stale leases **> ~15 min** on normal ticks.

---

## 4 — Webhook replay (`/super-admin/operations/webhook-replay`)

**Detection signals**

- Failed / orphaned receipts need re-drive; operator has vendor JSON (+ optional signature headers).

**Severity**

- **HIGH** financial / lifecycle side effects — treat every execute like prod traffic.

**Operational impact**

- Idempotent-ish reconcile can still move order/payment/shipment linkage; orphans emit platform events.

**Immediate containment**

- Run **`dryRun: true`** first — API **`POST /api/super-admin/operations/webhook-receipts/{id}/replay`** with JSON `{ "dryRun": true, "rawBody": "<stringified vendor JSON>", "signatureHeader": "..." }`.

**Investigation**

- Read **`plan`** in dry-run payload — **`buildOperationalWebhookReplayPlan`** exposes **`financialSafetyNote`** (refund reconcile suppressed).

**Recovery**

- Execute: **`{ "confirm": true, "dryRun": false, "rawBody": "...", "signatureHeader": "..." }`**.
- Duplicate hash noop: **`409`** **`REPLAY_DUPLICATE_HASH`** — optional **`forceReconcile: true`** (extra **`GovernanceAuditEvent`** **`OPERATIONS_WEBHOOK_RECEIPT_REPLAY_FORCE`** when processed + same hash).

**Escalation**

- Execute blocked on **`SIGNATURE_REQUIRED` / `INVALID_SIGNATURE`** while secrets set — do not bypass; obtain correct header/body pair.

**Do not**

- Combine **`dryRun: true`** with **`confirm: true`** (handler rejects).

**Audit / replay**

- **`OperationalWebhookReplayAudit`** + **`GovernanceAuditEvent`** (`OPERATIONS_WEBHOOK_RECEIPT_REPLAY` / `OPERATIONS_WEBHOOK_RECEIPT_REPLAY_FORCE`); Square success detail includes **`refundCaseReconcileSuppressed: true`**.

---

## 10 — Replay misuse prevention

**Detection signals**

- Operator requests “just run it” without dry-run; invalid signature; refund-heavy Square payload.

**Severity**

- **CRITICAL** if financial duplicate or wrong order linkage.

**Operational impact**

- Double settlement side effects (where idempotency gaps exist), wrong shipment state, audit noise.

**Immediate containment**

- Require dry-run + written note in incident; super-admin only.

**Investigation**

- Verify **`replayWebhookSignatureVerification`** outcome: when env keys present, missing/invalid signature **blocks execute** (not dry-run).
- Read plan **`expectedReconcile.outcome`** for orphan paths.

**Recovery**

- Only execute with **`verified`** or intentionally unconfigured provider (note still risks — treat as prod).

**Escalation**

- Repeat **`RECONCILE_THROW_REPLAY`** — engineering.

**Do not**

- Paste production secrets into tickets; use secure channel for **`rawBody`**.

**Audit / replay**

- All attempts audited; **`forceReconcile`** on duplicate hash is explicit escalated action.

---

## 11 — Notification backlog (stuck lease / cron)

**Detection signals**

- Notifications-health backlog grows; **`started_processing_at`** fresh with **`processed_at` null** (stuck lease); cron job missing in scheduler.
- Readiness flags **`INTERNAL_API_SECRET`** problems — cron won’t auth.

**Severity**

- **WARNING → HIGH** by age of oldest row and type (password reset vs marketing).

**Operational impact**

- Email queue stalls; incident detectors may see **`NOTIFICATION_BACKLOG`** via [operational-events.md](../operational-events.md) pipeline.

**Immediate containment**

- Restore cron or hit outbox manually in controlled way after auth verified.

**Investigation**

- Confirm Vercel/cron hits **`GET` or `POST /api/internal/cron/notification-outbox?limit=...`** (`app/api/internal/cron/notification-outbox/route.ts`).
- Auth: **`verifyInternalSecretFromRequest`** → **`INTERNAL_API_SECRET`** (Bearer / internal header parity with other internal routes).

**Recovery**

- Fix secret + redeploy; increase **`limit`** temporarily only if infra approves thundering herd.
- Stale lease: cron normally clears **`started_processing_at` > ~15 min**; else Phase A **`operator-requeue`** per route doc.

**Escalation**

- Processor throwing every tick — SES/credential errors (pair with SES runbook).

**Do not**

- Expose **`INTERNAL_API_SECRET`** in browser or logs.

**Audit / replay**

- Processor stamps **`notification-outbox.processor`** sourceTag; ops actions audited separately.
