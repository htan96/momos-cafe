/**
 * Agent-oriented module doc (not surfaced to customers).
 * Describes the Phase 1 type-only operational map for Cursor / workers.
 */
export const DOMAINS_README = `
domains/ — Phase 1 operational contracts (types, lifecycles, event stubs).
- Lifecycles align with lib/commerce/orderLifecycle where commerce orders overlap.
- events/ aggregates DomainEvent; emitStub is a noop until an outbox/bus exists.
- communications/workflowIds is the canonical WorkflowId union; lib/email/workflows imports it only.
Next: persist PlatformActivityEvent / outbox rows, SES workers, timeline projection.
`.trim();
