# Super-admin information architecture

This document mirrors the **mental domain model** wired in `SUPER_ADMIN_PLATFORM_NAV` (`components/platform/navConfig.ts`) and sidebar labels/subtitles (`components/platform/superAdminNavMeta.ts`). Paths are authoritative; redirects (for example `/super-admin/operations/orders` → `/super-admin/order-operations`) are noted on the canonical target.

## Domain → routes → when to use

| Domain | Route | When to use |
|--------|--------|--------------|
| **Overview** | `/super-admin` | Entry; cross-links elsewhere. |
| | `/super-admin/live-activity` | Operational activity feed / live telemetry. |
| | `/super-admin/incidents` | Structured incident runway (versus raw failure inbox). |
| **Operations** | `/super-admin/operations/failures` | Triage operational failure artifacts. |
| | `/super-admin/operations/webhook-replay` | Idempotent PSP / vendor replay tooling. |
| | `/super-admin/operations/lifecycle-integrity` | Cross-domain lifecycle coordination scan (read-only). |
| | `/super-admin/operations/notifications-health` | Notification outbox / lease / backlog health. |
| | `/super-admin/operations/safety` | Postgres + governance diagnostics. |
| | `/super-admin/operations/readiness` | Environment + rollup readiness. |
| **Commerce** | `/super-admin/order-operations` | Primary commerce order workspace (canonical vs legacy redirect shim). |
| | `/super-admin/order-operations/legacy` | Pre-unification order archive drill-in. |
| | `/super-admin/operations/payments` | Payment operations console. |
| | `/super-admin/operations/payment-integrity` | PSP coordination sanity (read-heavy). |
| | `/super-admin/operations/deliveries` | Shipments workspace entry (`/super-admin/shipping-operations`). |
| **Identity** | `/super-admin/users/customers` | Elevated diner / commerce customer dossier. |
| | `/super-admin/users/admins` | Staff Cognito roster + impersonation previews. |
| | `/super-admin/users/permissions` | Role / permission matrices. |
| | `/super-admin/operations/operational-identity` | Cross-plane identity dossier · narrow pooled group edits. |
| **Governance** | `/super-admin/platform/feature-controls` | Platform feature gates / presets. |
| | `/super-admin/platform/maintenance` | Storefront/admin maintenance posture (gates admin surface). |
| | `/super-admin/platform/communication-registry` | SES / transactional comms catalog (read-only governance view). |
| | `/super-admin/security/audit-logs` | Governance / security audit stream. |
| **Platform** | `/super-admin/operations/shippo-webhooks` | Shippo webhook receipt health UI. |
| | `/super-admin/system/integrations` | Integration posture / consoles. |
| | `/super-admin/system/service-health` | Runtime dependency health probes. |

## Related

- [Operational authority boundaries](./operational-authority-boundaries.md) — auth and audit primitives by API surface.
