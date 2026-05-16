import { OperationalActivitySeverity } from "@prisma/client";
import { emitOperationalEvent } from "@/lib/operations/emitOperationalEvent";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { isAdmin } from "@/lib/auth/cognito/roles";
import type { CognitoSessionUser } from "@/lib/auth/cognito/types";
import { recordGovernanceAuditEntry, resolveGovernanceStaffRole } from "@/lib/governance/governanceAuditRecord";

export async function emitStaffAuthLogoutEvent(
  user: CognitoSessionUser,
  options?: { ipAddress?: string | null }
): Promise<void> {
  if (!isAdmin(user.groups)) return;
  const actorType = user.groups?.includes("super_admin") ? "super_admin" : "admin";
  await emitOperationalEvent({
    type: OPERATIONAL_EVENT_TYPES.AUTH_LOGOUT,
    severity: OperationalActivitySeverity.info,
    actorType,
    actorId: user.sub,
    actorName: user.email ?? user.username ?? null,
    message: "Staff session signed out",
    metadata: { cognitoSub: user.sub },
    source: "api.auth.cognito.logout",
  });
  await recordGovernanceAuditEntry({
    actionType: "SESSION_TERMINATED",
    category: "session",
    actorId: user.sub,
    actorName: user.email ?? user.username ?? user.sub,
    actorRole: resolveGovernanceStaffRole(user.groups),
    description: "Staff session signed out (auth logout)",
    metadata: { terminationReason: "logout", source: "api.auth.cognito.logout" },
    ipAddress: options?.ipAddress ?? null,
  });
}
