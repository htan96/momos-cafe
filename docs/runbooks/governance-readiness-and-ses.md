# Governance emergency shutdown, readiness, SES

Cross-check env heuristics: [architecture/operational-readiness.md](../architecture/operational-readiness.md). Event severity framing: [operational-events.md](../operational-events.md).

---

## 5 — Governance emergency shutdown / storefront gates

**Control keys** (definitions in **`lib/governance/controlKeys.ts`**, UI **`/super-admin/platform/feature-controls`):

| Key | Effect (when **enabled**) |
|-----|---------------------------|
| **`checkout_disabled`** | Checkout + payment registration + related APIs **403** (`CHECKOUT_DISABLED`) |
| **`ordering_disabled`** | Broader commerce ordering choke (see **`lib/governance/governanceControls.ts`**) |
| **`storefront_read_only`** | Browsing/account allowed; mutate paths blocked |
| **`maintenance_mode`** | Emergency / maintenance UX — pair with **`/super-admin/platform/maintenance`** (routes admin-facing storefront maintenance; nav links admin settings maintenance too) |

**Detection signals**

- Active incident: money/shipping/webhook unknowns; abuse spike; data corruption suspected.
- Safety / Payment integrity / Live Activity show cluster failures.

**Severity**

- **CRITICAL** — deliberate customer-visible outage trade for safety.

**Operational impact**

- Lost conversion; must be communicated; staff should use admin/super-admin paths per policy.

**Immediate containment**

- Order of tightening (typical): **`storefront_read_only`** → **`checkout_disabled`** → **`ordering_disabled`** → **`maintenance_mode`** as needed.
- Document who toggled + time in incident channel.

**Investigation**

- Confirm which gate is actually **enabled** (Safety dashboard includes governance snapshot — **`loadOperationalSafetyDashboard`** keys).
- Verify no conflicting admin maintenance page state.

**Recovery**

- Re-enable in reverse order after root cause contained; smoke test checkout path in staging first if available.

**Escalation**

- Controls fail open/closed unexpectedly — engineering + verify Prisma **`PlatformGovernanceControl`**.

**Do not**

- Toggle without comms owner if customers are mid-checkout peak.

**Audit / replay**

- Governance changes write **`GovernanceAuditEvent`** (feature control adjustments audited in existing flows).

---

## 8 — SES / outbound email degradation

**Detection signals**

- **`sendTransactionalOutbound`** returns **`503`** **`EMAIL_UNCONFIGURED`** / thin credential codes — see [transactional-email-ses.md](../transactional-email-ses.md).
- Readiness env scan flags **`SES_FROM_EMAIL`**, **`AWS_REGION`**, credential chain heuristics (`environmentOperationalValidation.ts`).
- Notification rows fail with provider errors; integration health email probe degrades ([operational-events.md](../operational-events.md) integration cron).

**Severity**

- **HIGH** if auth / order emails blocked.

**Operational impact**

- Outbox fills; customers lack receipts; Phase B rewinds become tempting — **duplication risk**.

**Immediate containment**

- **`ordering_disabled`** or **`checkout_disabled`** if email is legally/operationally required for purchase completion.

**Investigation**

- Read **`_process.last_error`** on **`notification_events`**; verify **`resolveSesOutboundConfig`** prerequisites; check AWS SES account / suppression lists.

**Recovery**

- Fix env (**`SES_*`**, **`AWS_*`**), redeploy; drain **`/api/internal/cron/notification-outbox`** once SES healthy — start with **`limit`** ramps.

**Escalation**

- SES account-level block / bounce spike — AWS support.

**Do not**

- Route transactional around SES using unapproved providers (architecture is SES-only outbound).

**Audit / replay**

- Internal SES operational endpoints gated by **`INTERNAL_API_SECRET`** — see **`transactional-email-ses.md`** smoke section.

---

## 9 — Runtime readiness failures (`/super-admin/operations/readiness`)

**Detection signals**

- Red / failing rows during env scan (**Shippo prod secret**, Cognito IDs, SES, **`INTERNAL_API_SECRET`** length ≥ 24, Square webhook verification envs mirrored for replay parity, etc.).
- Safety rollup embedded in readiness shows Postgres pain simultaneously.

**Severity**

- **WARNING** single missing staging var — **CRITICAL** in prod if webhook verification or **`INTERNAL_API_SECRET`** broken.

**Operational impact**

- “Green” dashboards locally while production lacks secrets — correlates with 401 cron, 503 Shippo ingress, replay signature blocks.

**Immediate containment**

- If prod secret missing for inbound webhooks — treat like active security incident (**Shippo fail-closed**, Square verification gaps for replay).

**Investigation**

- Map each failing line to owner (platform vs payments vs comms); compare Vercel/env to **`.env.example`** expectations.

**Recovery**

- Set / rotate secrets; redeploy; re-run readiness page; hit a single cron tick with auth to confirm 200.

**Escalation**

- Heuristic false negatives/positives — file engineering issue with snapshot.

**Do not**

- Assume Readiness replaces integration tests — **no live PSP ping** during scan (`operational-readiness.md`).

**Audit / replay**

- Readiness is ephemeral HTTP — no persisted “report id”; capture screenshot / incident timestamps for audits manually if needed.
