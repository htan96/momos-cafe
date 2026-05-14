import type { DomainEvent } from "@/domains/events/aggregate";

/** Placeholder side-effect hook until NotificationEvent/outbox processors exist. */
export function emitStub(_event: DomainEvent): void {}
