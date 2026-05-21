# Operational activity events — canonical backbone

This document defines how **product-facing ops timeline** rows (`OperationalActivityEvent`) relate to **`GovernanceAuditEvent`**, **`NotificationEvent`**, and **`OperationalIncident`**.

## Roles

- **`OperationalActivityEvent`**: Durable timeline for fulfillment, integrations, incidents, staff visibility. Emitted via `emitOperationalEvent` / **`emitPlatformEvent`** (best-effort, never blocking user flows).
- **`GovernanceAuditEvent`**: Administrative / compliance audit trail — **unchanged** by this backbone; **no dual-write here** unless a feature already audited separately.
- **`NotificationEvent`**: Async orchestration payloads + backlog — backlog size may feed **`NOTIFICATION_BACKLOG`** incident detection; not merged into ops metadata.
- **`OperationalIncident`**: Aggregated anomalies with lifecycle — opened/updated by `lib/operations/incidentDetection.ts` from sliding windows over ops events **or** direct evaluators (e.g. integration health).

## Persisted `type` field convention

Ops rows store **`type` as the dotted subtype only**, lowercase — e.g. `payment.webhook.processing_failed`. **Category** is **not** concatenated onto `type`. It belongs in the **`PlatformEventMetadataV1` envelope** (see below).

Legacy emits (already in production) retain types like `order.created`, `payment.succeeded` — effectively the same pattern.

### Category taxonomy

| Category (`category` in envelope) | Meaning |
| --- | --- |
| **`ORDER_EVENT`** | Commerce / cafe checkout and order lifecycle signals |
| **`PAYMENT_EVENT`** | Tender, registration, and payment-provider webhooks |
| **`SHIPMENT_EVENT`** | Quotes, labels, carriers (Shippo) |
| **`AUTH_EVENT`** | Sign-in/session outcomes impacting staff/customer auth |
| **`MENU_EVENT`** | Catalog / menu hydration from Square |
| **`SYSTEM_EVENT`** | Email subsystem, integrations, internal automation |
| **`SECURITY_EVENT`** | Webhook authenticity, abusive patterns correlated to security tooling |
| **`INCIDENT_EVENT`** | Incident lifecycle markers (sparse; detectors usually write **`OperationalIncident`**) |

### Subtype dotted convention

- **`{domain}.{verb}`**: e.g. `auth.login.failed`, `menu.sync.failed`
- **`{domain}.{object}.{verb}`**: e.g. `payment.square.orphan_webhook`, `shipment.quote.failed`, `payment.webhook.processing_failed`

### Metadata envelope v1 (`metadata` JSON)

Required keys:

| Key | Purpose |
| --- | --- |
| **`schemaVersion`** | **`1`** for this shape |
| **`category`** | One of **`PlatformEventCategory`** (uppercase taxonomy) |
| **`subtype`** | Same string as **`OperationalActivityEvent.type`** (canonical duplicate for consumers) |
| **`lifecycle`** | See lifecycle table below |
| **`correlation`** | Object: **`correlationId`**, **`requestId`**, etc. (omit empty fields) |
| **`entities`** | Object: standardized IDs (camelCase keys) — optional per event |
| **`source`** | Object: **`handler`**, **`component`**, **`service`** (strings) |
| **`detail`** | Free-form diagnostics (classified codes preferred over raw dumps) |

Optional **policy** flags MAY appear at the envelope root alongside the above keys if needed (keep minimal).

### Entity linking keys (`entities`)

Standard keys (camelCase): **`customerId`**, **`adminId`**, **`commerceOrderId`**, **`cafeOrderId`**, **`paymentRecordId`**, **`shipmentId`**, **`incidentId`**, **`impersonationSessionId`**. Additional keys SHOULD live inside **`detail`** unless widely reused.

Older rows may expose UUIDs flat on `metadata` for UI jumps; **`readOperationalMetadataEntityIds`** also reads **`entities`**.

### Severity (`OperationalActivitySeverity`)

| Level | Meaning | Escalation expectation |
| --- | --- | --- |
| **`info`** | Expected state transitions / healthy automation | Routed to timeline only; ops triage optionally. |
| **`warning`** | Degraded UX or retries likely | Review during business hours; monitor if clustered. |
| **`error`** | User-visible failure / broken automation path | Respond within SLA; correlate with integrations and backlog. |
| **`critical`** | Multi-customer outage, security concern, severe money movement risk | Immediate on-call-style response until contained. |

Align with **`@prisma/client` `OperationalActivitySeverity`** (`lib/operations/emitOperationalEvent` imports it).

### Lifecycle (`lifecycle` in envelope)

| Value | Typical use |
| --- | --- |
| **`started`** | Idempotent boundary entered |
| **`processing`** | Intermediate work in flight |
| **`succeeded`** | Terminal OK |
| **`failed`** | Terminal failure |
| **`compensated`** | Reversal/refund/compensation concluded |
| **`cancelled`** | Aborted voluntarily |

### Observability boundaries

| Concern | Source of truth |
| --- | --- |
| **Ops timeline** | `OperationalActivityEvent` (+ Super Admin tooling) |
| **Governance audit** | `GovernanceAuditEvent` (RBAC/policy changes etc.) |

**Realtime** delivery uses **client polling** today (see **`GET /api/super-admin/live-activity/feed`** + **`LiveActivityWorkspace`**). Cursor-based pagination and incremental `since` prepends dedupe by event id. **`lib/liveActivity/types.ts`** stubs **`websocketUrl`** / SSE hooks for a future push layer — no WebSocket infra ships yet.

### Live Activity API

| Route | Purpose |
| --- | --- |
| **`GET /api/super-admin/live-activity/feed`** | Paginated `OperationalActivityEvent` → `LiveActivityEvent` via **`mapPlatformEventToLiveActivity`**. Query: `cursor`, `limit`, `filter`, `category`, `subtype`, `severity`, `source`, entity ids, `incidentId`, `since`, `until`. Returns `{ events, nextCursor, fetchedAt, pollingIntervalMs }`. |
| **`GET /api/super-admin/live-activity/snapshots`** | Sidebar counts: active incidents, degraded integrations, failed payments today, webhook/auth spike indicators, notification backlog, queue health. |

### Integration health cron

| Route | Purpose |
| --- | --- |
| **`GET/POST /api/internal/cron/integration-health`** | Runs **`evaluateAndPersistHealth`** (probes → snapshot diff → platform events → **`evaluateAllScheduledIncidentRules`**). Guard: **`INTERNAL_API_SECRET`** (Bearer or orchestration header). |
| **`POST /api/super-admin/integration-health/run`** | Super-admin manual trigger (same pipeline). |

**External cron:** call the internal route on a schedule (e.g. every 5 minutes):

```bash
curl -sS -H "Authorization: Bearer $INTERNAL_API_SECRET" \
  "https://<your-host>/api/internal/cron/integration-health"
```

Optional notification outbox stub: **`GET/POST /api/internal/cron/notification-outbox?limit=25`**.

Platform events emitted on health transitions include **`system.integration.degraded`**, **`.offline`**, **`.recovered`**, **`.slow_response`**, and **`system.notification.process_failed`** (outbox skeleton).

---

## Incident lifecycle alignment

`OperationalIncident.status` mirrors existing primitives:

| Status | Intent |
| --- | --- |
| **`active`** | New anomaly; awaiting owner |
| **`investigating`** | Actively mitigating |
| **`monitoring`** | Fix applied; verifying stability |
| **`resolved`** | Cleared |

Detectors SHOULD **merge** recurring signals into open incidents (**dedupe** by `INCIDENT_TYPES` rules in `incidentDetection.ts`). Types include **`INTEGRATION_DEGRADED`**, spikes on auth/shipping/webhooks, payment failure spike (existing).

---

## Code map

| Path | Responsibility |
| --- | --- |
| `lib/platform/events/taxonomy.ts` | `PlatformEventCategory`, subtype constants, lifecycle + severity helpers |
| `lib/platform/events/metadata.ts` | `PlatformEventMetadataV1`, guards, **`buildPlatformMetadata`** |
| `lib/platform/events/entityKeys.ts` | Standard **`entities`** key list / types |
| `lib/platform/events/emitPlatformEvent.ts` | Canonical emitter → **`emitOperationalEvent`** |
| `lib/operations/emitOperationalEvent.ts` | Prisma persistence + incident side-effect hook |
| `lib/operations/incidentDetection.ts` | Spike rules + **`evaluateIntegrationHealthIncidents`** (`INTEGRATION_DEGRADED` & ops emit) |
| `lib/operations/integrationHealth/evaluateAndPersistHealth.ts` | Probe run, snapshot diff, platform health events, cron batch hook |
| `lib/liveActivity/queryLiveActivityFeed.ts` | Cursor feed query + filters |
| `lib/liveActivity/queryLiveActivitySnapshots.ts` | Sidebar snapshot counts |
| `lib/liveActivity/mapPlatformEventToLiveActivity.ts` | `OperationalActivityEvent` → `LiveActivityEvent` adapter |
| `lib/notifications/processNotificationOutbox.ts` | Outbox skeleton processor |
| `lib/operations/notificationBacklogIncident.ts` | Optional **`evaluateNotificationBacklogIncident`** backlog monitor — wire to cron or health probes when prioritized |
