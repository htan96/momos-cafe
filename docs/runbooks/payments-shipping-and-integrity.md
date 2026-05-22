# Payments, Shippo shipping, and integrity drift

Correlation doc: [operational-events.md](../operational-events.md) (timeline vs governance audit). Deployment lens: [operational-readiness.md](../architecture/operational-readiness.md).

---

## 1 — Square orphan webhook (`ORPHAN_NO_LOCAL_PAYMENT`)

**Detection signals**

- **`WebhookDeliveryReceipt`** failed with `errorCode` **`ORPHAN_NO_LOCAL_PAYMENT`** — visible on Payment integrity / Payments ops / Live Activity / webhook replay rows.
- Super Admin **Payment integrity**: “Orphan Square webhook linkage” section; Payments page copy references the same tag.
- Customer impact: Square shows charge; local order stays **`pending_payment`** or lacks **`PaymentRecord.completed`**.

**Severity**

- **HIGH** money–data mismatch risk until verified against Square Dashboard.

**Operational impact**

- Reconciliation tooling flags orphan; finance and CS may disagree on paid vs unpaid. Replay without fixing linkage can repeat orphan markers.

**Immediate containment**

- If volume spiking or reconciliation unknown: **`checkout_disabled`** (and **`ordering_disabled`** if needed) via `/super-admin/platform/feature-controls` — see governance runbook.

**Investigation**

- Open **`/super-admin/operations/payment-integrity`** and **`/super-admin/operations/payments`**; correlate order id vs Square payment id from receipt metadata / failures inbox **`/super-admin/operations/failures`**.
- Confirm Square Dashboard payment state, **`reference_id` / order idempotency alignment**, and webhook delivery history.

**Recovery**

- Authorized recovery: **`POST /api/super-admin/operations/recovery/square-payment-lookup`** (super-admin authenticated; body per route implementation — links from Payment integrity banner). Prefer this over hand-editing Postgres.
- After local graph matches PSP: optional operational webhook replay (payment reconcile only — see replay runbook).

**Escalation**

- Unexplained PSP vs DB divergence after lookup; suspected duplicate capture; reconciliation route errors repeatedly.

**Do not**

- Mark orders **`paid`** in admin without confirming Square tender and local **`payment_records`** consistency.
- Bulk-delete webhook receipts — they’re evidence.

**Audit / replay**

- Replay emits **`GovernanceAuditEvent`** types **`OPERATIONS_WEBHOOK_RECEIPT_REPLAY`** / **`OPERATIONS_WEBHOOK_RECEIPT_REPLAY_FORCE`** (when forced); Square replay runs **`reconcileSquarePaymentWebhook` only** (refund-case reconcile suppressed).

---

## 2 — Shippo orphan shipment / ingress fail-closed

**Detection signals**

- **`/super-admin/operations/shippo-webhooks`**: orphans count **> 0**, failures with **`ORPHAN_NO_LOCAL_SHIPMENT`**, signature invalid spikes.
- Production logs / clients: **`shippo_webhook_hmac_required_in_production`** ( **`503`** ) when **`SHIPPO_WEBHOOK_SECRET`** unset — **`lib/webhooks/shippo/shippoInboundProductionGate.ts`**.

**Severity**

- **HIGH** when customers expect tracking or labels and receipts fail; **CRITICAL** if bypassing verification is considered (misconfig).

**Operational impact**

- Tracking state stale; Operational Safety may show webhook strain; shipments workspace out of sync with carrier reality.

**Immediate containment**

- Do **not** disable verification. Fix secret in host env (**Readiness** will flag drift). Optionally pause labeling-only workflows operationally until receipts flow — not by clearing secrets.

**Investigation**

- Shippo dashboard event log vs local orphan table (note: persisted receipts omit raw payloads — use provider export / pasted JSON for replay).
- Align **tracking numbers** / transaction ids with local **`Shipment`** rows (console: **`/super-admin/operations/deliveries`**).

**Recovery**

- Set **`SHIPPO_WEBHOOK_SECRET`**; replay verified payloads via **`POST /api/super-admin/operations/webhook-receipts/{id}/replay`** after dry-run (**Webhook replay** UI).

**Escalation**

- Persistent signature-invalid with correct secret (clock skew unlikely for HMAC — suspect proxy rewriting body).

**Do not**

- Turn off prod fail-closed or accept unsigned webhooks to “clear the queue”.

**Audit / replay**

- Shippo execute path audited like Square; orphaned outcomes patch receipt with **`ORPHAN_NO_LOCAL_SHIPMENT`**.

---

## 6 — Payment / order drift (Square authority)

**Detection signals**

- **`/super-admin/operations/payment-integrity`** categories (stale **`pending_payment`**, paid-like orders without **`completed`** payment row, **`fulfillment_before_payment`** shell, stale **`payment_records.pending`**, refund linkage oddities). Page states Square is PSP truth — treat DB as heuristic only.

**Severity**

- **WARNING → HIGH** by row counts / badges on that page.

**Operational impact**

- Reports and admin UX disagree with Square; bad fulfillment or refund decisions.

**Immediate containment**

- **`storefront_read_only`** or **`ordering_disabled`** if staff might act on wrong state; pause auto-fulfillment paths if procedures allow.

**Investigation**

- Per-row links to **`/super-admin/order-operations/{id}`**; cross-check Operational Safety **`/super-admin/operations/safety`** rollup.
- Square Dashboard for each surfaced id before any status mutation.

**Recovery**

- Use Square recovery **`square-payment-lookup`** when orphaned capture; webhook replay only after plan review.

**Escalation**

- Widespread “paid-like without payment” (**HIGH** badges).

**Do not**

- “Fix” drift by tweaking order **`status`** without PSP confirmation.

**Audit / replay**

- Integrity page is **read-only**; actions go through governance + replay/recovery endpoints (audited).

---

## 7 — Fulfillment before payment — heuristic

**Detection signals**

- Payment integrity bucket **“Fulfillment ahead of settlement shell”** (`fulfillmentBeforePaymentShell`); Operational Safety overlaps on conservative paid heuristics.

**Severity**

- **HIGH** — potential ship-without-money.

**Operational impact**

- CX and liability exposure; carriers may move goods while PSP shows unpaid/failed.

**Immediate containment**

- Stop release of physical goods for listed orders until Square verified; escalate to ops lead.

**Investigation**

- Open order operations; inspect **`payment_records`**, webhook receipts, fulfillment group timeline; confirm Square tender state.

**Recovery**

- If unpaid: halt shipment, coordinate refund/void per support process; if Square paid but DB wrong: **`square-payment-lookup`** then reconcile receipts.

**Escalation**

- Any row with carrier accepted + no completed tender.

**Do not**

- Rely solely on Postgres shell status for shipment authorization.

**Audit / replay**

- Fulfillment changes should leave ops timeline events where emitters exist — correlate in Live Activity (**`/super-admin/live-activity`**).

---

## 12 — “Impossible” / contradictory lifecycle

No **`lifecycle-integrity`** dashboard in-repo — triage via **`/super-admin/operations/safety`**, **`/super-admin/operations/payment-integrity`**, **`/super-admin/order-operations/{id}`**.

| | |
| --- | --- |
| **Detection signals** | Safety **HIGH/CRITICAL** PSP-vs-shell wording; integrity rows (`paidLikeWithoutCompletedPayment`, `fulfillmentBeforePaymentShell`); stuck payment/webhook widgets; gaps per [visibility audit](../architecture/customer-operational-visibility-audit.md). |
| **Severity / impact** | **HIGH → CRITICAL** with concurrent money motion; wrong CS/fulfillment/refund stance. |
| **Immediate containment** | Clustered unknowns → **`checkout_disabled`** / **`ordering_disabled`** ([governance](./governance-readiness-and-ses.md)). |
| **Investigation** | Order graph: payments, refunds, webhook receipts (failures + replay console), Shippo if labeled. |
| **Recovery** | Ordered path: **money → fulfillment → messaging** — fix root subsystem before cascading edits. |
| **Escalation** | Still inconsistent after Square + webhook evidence — engineering. |
| **Do not** | Patch Postgres status across multiple domains in parallel without PSP proof. |
| **Audit / replay** | **`GovernanceAuditEvent`**, webhook replay audits — avoid raw SQL edits. |
