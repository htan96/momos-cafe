import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import type { GovernanceAuditActionType } from "@/lib/governance/governanceAuditActionTypes";

export type RecordGovernanceAuditEntryArgs = {
  tx?: Prisma.TransactionClient;
  actionType: GovernanceAuditActionType;
  category?: string | null;
  actorId: string;
  actorName: string;
  actorRole?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  reason?: string | null;
  ipAddress?: string | null;
};

/**
 * Persists one append-only governance audit row. Never throws — callers must not rely on write success for authz.
 */
export async function recordGovernanceAuditEntry(args: RecordGovernanceAuditEntryArgs): Promise<void> {
  const client = args.tx ?? prisma;
  try {
    await client.governanceAuditEvent.create({
      data: {
        actionType: args.actionType,
        category: args.category ?? null,
        actorId: args.actorId,
        actorName: args.actorName,
        actorRole: args.actorRole ?? null,
        targetType: args.targetType ?? null,
        targetId: args.targetId ?? null,
        targetName: args.targetName ?? null,
        description: args.description ?? null,
        metadata: args.metadata === undefined || args.metadata === null ? undefined : (args.metadata as object),
        reason: args.reason ?? null,
        ipAddress: args.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.error("[governance_audit] recordGovernanceAuditEntry failed", err);
  }
}

export function resolveGovernanceStaffRole(groups: readonly string[] | undefined): "super_admin" | "admin" {
  return isSuperAdmin(groups) ? "super_admin" : "admin";
}
