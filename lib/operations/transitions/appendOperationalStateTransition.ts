import type { Prisma } from "@prisma/client";

/** First domain using append-only transitions; extend string as new domains adopt the table. */
export const OPERATIONAL_STATE_TRANSITION_DOMAIN = {
  SUPPORT: "support",
} as const;

export type AppendOperationalStateTransitionInput = {
  domain: string;
  entityId: string;
  fromStatus: string;
  toStatus: string;
  actorType: string;
  actorId: string;
  actorName?: string | null;
  sourceSystem: string;
  note?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Minimal append-only operational transition log (replay / audit).
 * Call from within `prisma.$transaction` where possible.
 */
export async function appendOperationalStateTransition(
  tx: Prisma.TransactionClient,
  input: AppendOperationalStateTransitionInput
): Promise<void> {
  await tx.operationalStateTransition.create({
    data: {
      domain: input.domain,
      entityId: input.entityId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      actorType: input.actorType,
      actorId: input.actorId,
      actorName: input.actorName ?? null,
      sourceSystem: input.sourceSystem,
      note: input.note ?? null,
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    },
  });
}
