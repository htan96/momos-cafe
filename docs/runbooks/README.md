# Operational runbooks

Short, concrete playbooks tied to Super Admin consoles and handlers in this repo. For event taxonomy and audit boundaries, see [operational-events.md](../operational-events.md). For deployment vs Postgres signals, see [architecture/operational-readiness.md](../architecture/operational-readiness.md).

## Index

| Runbook | Covers |
|---------|--------|
| [payments-shipping-and-integrity.md](./payments-shipping-and-integrity.md) | Square orphan webhook / recovery (`ORPHAN_NO_LOCAL_PAYMENT`), Shippo orphans & fail-closed ingress, payment–order drift, fulfillment-before-payment, “impossible” lifecycle cues |
| [notifications-webhooks-replay-and-backlog.md](./notifications-webhooks-replay-and-backlog.md) | Notification dead-letter & Phase B, webhook replay console (dry-run / `forceReconcile`), replay misuse, notification backlog / cron |
| [governance-readiness-and-ses.md](./governance-readiness-and-ses.md) | Governance emergency gates, readiness scan, SES / email degradation |

### Super Admin — operations (quick paths)

| Need | Route |
|------|-------|
| Cross-domain Postgres + governance rollup | `/super-admin/operations/safety` |
| Payment heuristics (Square authority called out on-page) | `/super-admin/operations/payment-integrity` |
| Env + configuration scan | `/super-admin/operations/readiness` |
| Notification outbox | `/super-admin/operations/notifications-health` |
| Replay UI | `/super-admin/operations/webhook-replay` |
| Shippo receipt window (72h) | `/super-admin/operations/shippo-webhooks` |
| Feature gates (checkout / ordering / read-only / maintenance) | `/super-admin/platform/feature-controls`; storefront maintenance UX | `/super-admin/platform/maintenance` |

## When to lead with containment

Use **containment first** when any of these are true:

- Suspected double charge, phantom paid order, or staff about to fulfill without verified Square tender.
- Webhook ingress can’t authenticate (risk of spoofed lifecycle or payment signals).
- Outbound email is failing at scale — customers perceive “nothing works” while money or fulfillment continues.
- You are not sure yet — governance toggles (`checkout_disabled`, `ordering_disabled`, `storefront_read_only`, `maintenance_mode`) narrow blast radius faster than Postgres forensics alone.

Containment steps live in each runbook; default posture: stop new commits of money/work, preserve evidence (receipt rows, governance audit), then investigate with read-only dashboards.
