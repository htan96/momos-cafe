import { prisma } from "@/lib/prisma";

export type ImpersonationLedgerPreviewRow = {
  id: string;
  actorEmail: string;
  targetEmail: string;
  scope: string;
  startedAt: Date;
  endedAt: Date | null;
  /** Governance justification excerpt from paired `IMPERSONATION_STARTED`, when present. */
  gist: string | null;
};

function ledgerIdFromAuditMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const id = (metadata as { ledgerId?: unknown }).ledgerId;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

/** Recent ledger rows plus optional governance justification excerpts (paired by `metadata.ledgerId`). */
export async function loadRecentImpersonationLedgerPreview(limit = 15): Promise<ImpersonationLedgerPreviewRow[]> {
  const take = Math.min(40, Math.max(5, limit));
  const sessions = await prisma.impersonationSupportSession.findMany({
    orderBy: { startedAt: "desc" },
    take,
    select: {
      id: true,
      actorEmail: true,
      targetEmail: true,
      scope: true,
      startedAt: true,
      endedAt: true,
    },
  });

  const ids = sessions.map((s) => s.id);
  if (ids.length === 0) return [];

  const starts = await prisma.governanceAuditEvent.findMany({
    where: {
      actionType: "IMPERSONATION_STARTED",
      OR: ids.map((ledgerId) => ({ metadata: { path: ["ledgerId"], equals: ledgerId } })),
    },
    select: {
      metadata: true,
      reason: true,
    },
  });

  const gistByLedgerId = new Map<string, string>();
  for (const row of starts) {
    const lid = ledgerIdFromAuditMetadata(row.metadata);
    if (!lid || gistByLedgerId.has(lid)) continue;
    const r = typeof row.reason === "string" ? row.reason.trim() : "";
    if (r) gistByLedgerId.set(lid, r.length > 200 ? `${r.slice(0, 200)}…` : r);
  }

  return sessions.map((s) => ({
    id: s.id,
    actorEmail: s.actorEmail,
    targetEmail: s.targetEmail,
    scope: s.scope,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    gist: gistByLedgerId.get(s.id) ?? null,
  }));
}
