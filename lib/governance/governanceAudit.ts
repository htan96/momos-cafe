import { prisma } from "@/lib/prisma";

export type GovernanceAuditType =
  | "impersonation_start"
  | "impersonation_end"
  | "perspective_change"
  | "platform_feature_patch";

export async function writeGovernanceAudit(args: {
  type: GovernanceAuditType;
  actorSub: string;
  actorEmail: string;
  targetEmail?: string | null;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  await prisma.governanceAuditEvent.create({
    data: {
      type: args.type,
      actorSub: args.actorSub,
      actorEmail: args.actorEmail,
      targetEmail: args.targetEmail ?? null,
      meta: args.meta === null || args.meta === undefined ? undefined : (args.meta as object),
    },
  });
}
