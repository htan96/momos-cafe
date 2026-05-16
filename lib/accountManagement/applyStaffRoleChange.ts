import { OperationalActivitySeverity } from "@prisma/client";
import {
  adminCountUsersInPoolGroup,
  adminGetPoolUser,
  adminListAssignedGroupsForUser,
  cognitoEnsureStaffMembership,
} from "@/lib/auth/cognito/adminPoolDirectory";
import type { CognitoEnvConfig } from "@/lib/auth/cognito/config";
import type { AccountMgmtRole } from "@/lib/accountManagement/accountsBrowse";
import { deriveAccountRoleFromGroups } from "@/lib/accountManagement/deriveAccountRole";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";
import type { GovernanceAuditActionType } from "@/lib/governance/governanceAuditActionTypes";
import { clientIpFromRequest } from "@/lib/governance/impersonationRequestMeta";
import { emitOperationalEvent } from "@/lib/operations/emitOperationalEvent";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";

function rank(role: AccountMgmtRole): number {
  switch (role) {
    case "customer":
      return 0;
    case "admin":
      return 1;
    case "super_admin":
      return 2;
    default:
      return 0;
  }
}

function pickGovernanceAction(from: AccountMgmtRole, to: AccountMgmtRole): GovernanceAuditActionType {
  const up = rank(to) > rank(from);
  const down = rank(to) < rank(from);
  if (up && (to === "admin" || to === "super_admin")) return "ADMIN_PROMOTED";
  if (down && (from === "admin" || from === "super_admin")) return "ADMIN_DEMOTED";
  return "USER_ROLE_CHANGED";
}

export type ApplyStaffRoleChangeInput = {
  cfg: CognitoEnvConfig;
  request: Request;
  actor: { sub: string; email: string | null; username: string | null };
  /** Cognito `Username`. */
  targetUsernameRaw: string;
  nextRole: AccountMgmtRole;
  /** Mandatory when demoting/removing super_admin from oneself. Lowercase trimmed email acknowledgement. */
  selfDemotionAckEmail?: string | null;
};

export type ApplyStaffRoleChangeResult =
  | { ok: true; username: string; fromRole: AccountMgmtRole; toRole: AccountMgmtRole }
  | { ok: false; code: string; status: number; message?: string };

export async function applyStaffRoleChange(input: ApplyStaffRoleChangeInput): Promise<ApplyStaffRoleChangeResult> {
  const cognitoUsername = input.targetUsernameRaw.trim();
  if (!cognitoUsername) {
    return { ok: false, code: "missing_username", status: 400 };
  }

  const targetUser = await adminGetPoolUser(input.cfg, cognitoUsername);
  if (!targetUser) return { ok: false, code: "target_not_found", status: 404 };

  const groupsBefore = await adminListAssignedGroupsForUser(input.cfg, targetUser.username);
  const fromRole = deriveAccountRoleFromGroups(groupsBefore);
  const toRole = input.nextRole;

  if (fromRole === toRole) {
    return { ok: false, code: "no_role_change", status: 409, message: "User already has this membership." };
  }

  if (fromRole === "super_admin" && toRole !== "super_admin" && input.actor.sub === targetUser.sub) {
    const expected = input.actor.email?.trim().toLowerCase() ?? "";
    const ack = input.selfDemotionAckEmail?.trim().toLowerCase() ?? "";
    if (!expected || ack !== expected) {
      return {
        ok: false,
        code: "confirmation_required",
        status: 400,
        message: "Type your account email exactly to confirm self-demotion from super-admin.",
      };
    }
  }

  if (fromRole === "super_admin" && toRole !== "super_admin") {
    const n = await adminCountUsersInPoolGroup(input.cfg, "super_admin");
    if (n <= 1) {
      return {
        ok: false,
        code: "last_super_admin",
        status: 400,
        message: "Cannot remove the final super-admin. Promote another operator first.",
      };
    }
  }

  await cognitoEnsureStaffMembership(input.cfg, {
    username: targetUser.username,
    nextRole: toRole,
    previousGroups: groupsBefore,
  });

  const govAction = pickGovernanceAction(fromRole, toRole);
  const actorName = input.actor.email?.trim() || input.actor.username?.trim() || input.actor.sub;

  const ipAddress = clientIpFromRequest(input.request);

  await recordGovernanceAuditEntry({
    actionType: govAction,
    category: "access",
    actorId: input.actor.sub,
    actorName,
    actorRole: "super_admin",
    targetType: "cognito_user",
    targetId: targetUser.sub,
    targetName: targetUser.email?.trim().toLowerCase() ?? targetUser.username,
    description: `${fromRole.replace("_", " ")} → ${toRole.replace("_", " ")}`,
    metadata: {
      cognitoUsername: targetUser.username,
      fromRole,
      toRole,
      prevGroups: groupsBefore,
      source: "api.admin.accounts.staff.role_patch",
    },
    ipAddress,
  });

  const msgTier = `${fromRole} → ${toRole}`;

  await emitOperationalEvent({
    type: OPERATIONAL_EVENT_TYPES.USER_ROLE_CHANGED,
    severity:
      govAction === "ADMIN_DEMOTED" ? OperationalActivitySeverity.warning : OperationalActivitySeverity.info,
    actorType: "super_admin",
    actorId: input.actor.sub,
    actorName,
    message: `User role changed (${msgTier})`,
    metadata: {
      cognitoUsername: targetUser.username,
      targetSub: targetUser.sub,
      fromRole,
      toRole,
      governanceAction: govAction,
    },
    source: "account_management.role_patch",
  });

  if (govAction === "ADMIN_PROMOTED") {
    await emitOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.ADMIN_PROMOTED,
      severity: OperationalActivitySeverity.info,
      actorType: "super_admin",
      actorId: input.actor.sub,
      actorName,
      message: `Operator promoted (${msgTier})`,
      metadata: { cognitoUsername: targetUser.username, targetSub: targetUser.sub, fromRole, toRole },
      source: "account_management.role_patch",
    });
  }
  if (govAction === "ADMIN_DEMOTED") {
    await emitOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.ADMIN_DEMOTED,
      severity: OperationalActivitySeverity.warning,
      actorType: "super_admin",
      actorId: input.actor.sub,
      actorName,
      message: `Operator demoted (${msgTier})`,
      metadata: { cognitoUsername: targetUser.username, targetSub: targetUser.sub, fromRole, toRole },
      source: "account_management.role_patch",
    });
  }

  return { ok: true, username: targetUser.username, fromRole, toRole };
}
