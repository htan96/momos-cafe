# Operational containment signals (visibility only)

## Philosophy

Containment signals are **advisory** summaries built from **existing** integrity scans and operational health aggregates. They exist to help super-admin operators **see** cross-domain pressure (payments vs fulfillment vs webhooks vs notifications) in one escalation-ordered list.

They are **not** a control plane. They do not change runtime behavior.

## Explicit prohibitions

The following are **out of scope** and must not be introduced as follow-ons to this module without separate product/security review:

- Automatically freezing or quarantining `CommerceOrder` rows (or any commerce shell) in Postgres
- Automatically mutating lifecycle, fulfillment, or payment state
- Automatically disabling integrations, webhooks, or feature flags
- Cron/worker jobs that **apply** containment without a human-in-the-loop action

## How signals are derived

| Signal area | Source | Notes |
| ----------- | ------ | ----- |
| Lifecycle / payment / fulfillment coordination | `loadLifecycleIntegrityReport` → `scanCommerceLifecycleIntegrity` findings | Severe codes map to containment kinds (e.g. fulfillment advanced while order still pre-payment). |
| Notification dead-letter pressure | `loadNotificationOperationalHealth` → `reliability.deadLetterAttemptCapRows` | Counts terminal rows whose payload records `attempt_cap` — a real aggregate, not a full loop timeline. |
| Operator requeue churn | Same snapshot → `governanceTouches.operatorNotificationRequeuesLast24h` | High volume implies manual rewinds without stable root-cause closure. |
| Webhook receipt repeat replays | Capped SQL `GROUP BY receipt_id` on `OperationalWebhookReplayAudit` | Flags receipts with many super-admin replay attempts in a trailing window. |
| Failure triage queue pressure | Count of non-terminal `OperationalFailureTriage` rows touched recently | Steers operators to the failures inbox; does not interpret failure semantics. |

## Gaps & honesty

- **Notification “retry loops”** as a time-series pattern (A → B → A) is **not** aggregated here. We surface `attempt_cap` totals and operator requeue counts instead; deeper loop analytics would need new telemetry.
- **Quarantine** is documented as a **conceptual operator stance** in `lib/operations/containment/concepts.ts` — there is **no** persisted platform quarantine flag tied to these signals (by design).

## Related runbooks

- `docs/runbooks/payments-shipping-and-integrity.md`
- `docs/runbooks/notifications-webhooks-replay-and-backlog.md`
- `docs/runbooks/governance-readiness-and-ses.md`
