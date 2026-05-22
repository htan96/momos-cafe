# Operational readiness (super-admin)

Internal super-admin tooling only (`/super-admin/operations/readiness`). It does **not** run middleware or startup assertions against production traffic.

## On-demand validation

When an operator loads the readiness page, the server:

1. **Scans deployment environment variables** synchronously (`lib/super-admin/operationalReadiness/environmentOperationalValidation.ts`). The scan is heuristic: it mirrors known gates (e.g. Shippo production fail-closed, SES outbound `resolveSesOutboundConfig`, Cognito IDs) but never calls PSPs, SES, or Postgres for env proof.
2. **Reuses the Operational Safety dashboard loader** (`loadOperationalSafetyDashboard`) for Postgres-backed counts, webhook receipt rollups, and governance/feature snapshots (`lib/super-admin/operationalReadiness/loadOperationalReadinessReport.ts`).

No new tables are required. Results are ephemeral to the HTTP request — nothing is persisted as a readiness record.

## Why separate from Operational Safety?

Operational Safety focuses on **data-plane drift** (payments, webhooks in receipt tables, notifications backlog). Operational Readiness adds a **deployment / configuration** lens so operators can correlate “everything looks sick in Postgres” with “half the secrets are unset in Vercel”.

## Shared semantics preview

The readiness page renders an **effective thresholds preview** sourced from [`lib/operations/semantics/`](../../lib/operations/semantics/) (`describeOperationalSemanticsSnapshot`). Canonical tables — stale definitions, ladders, leases, retry meanings, escalation posture — live in **[`operational-semantics.md`](./operational-semantics.md)**.

For **which domain should win** when payment, fulfillment, shipment, and notification signals disagree (validation-first, no auto-heal), see [**Commerce lifecycle authority**](./commerce-lifecycle-authority.md) — it complements this page’s “is the deployment wired?” question with an explicit source-of-truth story.
