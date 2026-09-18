import { prisma } from "@/lib/prisma";

export type LatestGovernanceAuditReason = {
  reason: string | null;
  createdAt: string;
  actorName: string;
};

/**
 * Latest audit reason per governance control / platform feature / maintenance key.
 */
export async function loadLatestGovernanceAuditReasons(
  targetIds: string[]
): Promise<Record<string, LatestGovernanceAuditReason>> {
  if (targetIds.length === 0) return {};

  const rows = await prisma.governanceAuditEvent.findMany({
    where: {
      targetId: { in: targetIds },
      actionType: {
        in: ["GOVERNANCE_CONTROL_UPDATED", "PLATFORM_FEATURE_UPDATED", "MAINTENANCE_UPDATED"],
      },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(500, targetIds.length * 8),
    select: {
      targetId: true,
      reason: true,
      createdAt: true,
      actorName: true,
    },
  });

  const out: Record<string, LatestGovernanceAuditReason> = {};
  for (const row of rows) {
    const id = row.targetId;
    if (!id || out[id]) continue;
    out[id] = {
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
      actorName: row.actorName,
    };
  }
  return out;
}
