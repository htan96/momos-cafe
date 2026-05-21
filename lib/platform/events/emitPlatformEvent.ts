import type { OperationalActivitySeverity, Prisma } from "@prisma/client";
import { emitOperationalEvent, type EmitOperationalEventInput } from "@/lib/operations/emitOperationalEvent";
import type { OperationalEventType } from "@/lib/operations/operationalEventTypes";
import { buildPlatformMetadata } from "@/lib/platform/events/metadata";
import type { PlatformEventMetadataV1 } from "@/lib/platform/events/metadata";
import type {
  PlatformEventCategory,
  PlatformLifecycle,
  PlatformEventSubtype,
} from "@/lib/platform/events/taxonomy";
import type { PlatformEntityLinks } from "@/lib/platform/events/entityKeys";

export type EmitPlatformEventInput = {
  category: PlatformEventCategory;
  /** Persisted verbatim (lowercase) on `OperationalActivityEvent.type`; must match dotted convention. */
  subtype: PlatformEventSubtype | string;
  lifecycle: PlatformLifecycle;
  severity?: OperationalActivitySeverity;
  actorType: EmitOperationalEventInput["actorType"];
  actorId?: string | null;
  actorName?: string | null;
  message: string;
  correlation?: PlatformEventMetadataV1["correlation"];
  entities?: PlatformEntityLinks;
  source?: PlatformEventMetadataV1["source"];
  detail?: Record<string, unknown>;
  /** Passed through to persisted `OperationalActivityEvent.source`. */
  sourceTag?: string | null;
  /** Extra flats merged atop envelope (backward-compatible UI lookups). Prefer `entities`. */
  legacyFlatMetadata?: Record<string, unknown>;
  tx?: EmitOperationalEventInput["tx"];
  /** When true, skips async incident sliding-window detectors (avoid duplicate rules). */
  skipIncidentEvaluation?: boolean;
};

function normalizeSubtype(subtype: string): string {
  return subtype.trim().toLowerCase();
}

/**
 * Canonical ops timeline emit — persists dotted **`type`**, nests **`schemaVersion`/envelope keys** inside `metadata`.
 * Never throws; failures log only (`emitOperationalEvent` contract).
 */
export async function emitPlatformEvent(input: EmitPlatformEventInput): Promise<string | null> {
  try {
    const subtype = normalizeSubtype(input.subtype);

    const envelope = buildPlatformMetadata({
      category: input.category,
      subtype,
      lifecycle: input.lifecycle,
      correlation: input.correlation ?? {},
      entities: input.entities ?? {},
      source: input.source ?? {},
      detail: input.detail ?? {},
    });

    const metadata: Record<string, unknown> = {
      ...envelope,
      ...(input.legacyFlatMetadata ?? {}),
      // Convenience mirror for dashboards that pivot on camelCase totals
      ...(Object.keys(envelope.entities).length > 0 ? envelope.entities : {}),
    };

    return emitOperationalEvent({
      type: subtype as OperationalEventType,
      severity: input.severity ?? "warning",
      actorType: input.actorType,
      actorId: input.actorId,
      actorName: input.actorName,
      message: input.message,
      metadata: metadata as Prisma.InputJsonValue,
      source: input.sourceTag ?? undefined,
      tx: input.tx,
      skipSideEffects: input.skipIncidentEvaluation ?? false,
    });
  } catch (e) {
    console.error("[emitPlatformEvent] unexpected", input.subtype, e);
    return null;
  }
}
