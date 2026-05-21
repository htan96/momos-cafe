import type {
  PlatformEventCategory,
  PlatformLifecycle,
  PlatformEventSubtype,
} from "@/lib/platform/events/taxonomy";
import type { PlatformEntityLinks } from "@/lib/platform/events/entityKeys";

export type PlatformEventCorrelation = {
  correlationId?: string;
  requestId?: string;
  /** Square / provider webhook identifiers when present */
  webhookEventId?: string;
};

export type PlatformEventSource = {
  /** Route or module emitting the row */
  handler?: string;
  component?: string;
  service?: string;
};

/** Envelope persisted at the root of `OperationalActivityEvent.metadata` (alongside sparse legacy flats). */
export type PlatformEventMetadataV1 = {
  schemaVersion: 1;
  category: PlatformEventCategory;
  subtype: PlatformEventSubtype | string;
  lifecycle: PlatformLifecycle;
  correlation: PlatformEventCorrelation;
  entities: PlatformEntityLinks;
  source: PlatformEventSource;
  detail: Record<string, unknown>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isPlatformEventMetadataV1(value: unknown): value is PlatformEventMetadataV1 {
  if (!isPlainObject(value)) return false;
  if (value.schemaVersion !== 1) return false;
  if (typeof value.subtype !== "string") return false;
  if (!isPlainObject(value.detail)) return false;
  return (
    typeof value.category === "string" &&
    typeof value.lifecycle === "string" &&
    isPlainObject(value.correlation) &&
    isPlainObject(value.entities) &&
    isPlainObject(value.source)
  );
}

export type BuildPlatformMetadataInput = Omit<PlatformEventMetadataV1, "schemaVersion"> & {
  schemaVersion?: 1;
};

export function buildPlatformMetadata(input: BuildPlatformMetadataInput): PlatformEventMetadataV1 {
  return {
    schemaVersion: input.schemaVersion ?? 1,
    category: input.category,
    subtype: input.subtype,
    lifecycle: input.lifecycle,
    correlation: { ...input.correlation },
    entities: { ...input.entities },
    source: { ...input.source },
    detail: { ...input.detail },
  };
}
