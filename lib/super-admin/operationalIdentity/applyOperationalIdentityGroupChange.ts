import {
  adminCountUsersInPoolGroup,
  adminListAssignedGroupsForUser,
  adminRemoveUserFromPoolGroup,
} from "@/lib/auth/cognito/adminPoolDirectory";
import { adminAddUserToGroup } from "@/lib/auth/cognito/cognitoClient";
import type { CognitoEnvConfig } from "@/lib/auth/cognito/config";
import type { CognitoGroup } from "@/lib/auth/cognito/types";
import { KNOWN_COGNITO_GROUPS } from "@/lib/auth/cognito/roles";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";
import { clientIpFromRequest } from "@/lib/governance/impersonationRequestMeta";
import { resolveOperationalPoolUserBySub } from "./resolvePoolUserBySub";

const GROUP_SET = new Set<string>(KNOWN_COGNITO_GROUPS);

export type ApplyOperationalGroupChangeInput = {
  cfg: CognitoEnvConfig;
  request: Request;
  actor: { sub: string; email: string | null; username: string | null };
  /** Pool `sub` claim — resolves to **`Username`** for Admin SDK commands. */
  targetCognitoSub: string;
  groupName: CognitoGroup;
  action: "add" | "remove";
  /** Self-service guard when shedding `super_admin` from the signed-in actor. */
  selfDemotionAckEmail?: string | null;
};

export type ApplyOperationalGroupChangeResult =
  | { ok: true; beforeGroups: string[]; afterGroups: string[]; cognitoUsername: string }
  | { ok: false; code: string; status: number; message?: string };

/**
 * Super-admin granular pool group mutation with **`AdminListGroupsForUser`** snapshots for governance metadata.
 *
 * Invariants (**narrow blast radius):**
 * - Removing **`super_admin`** blocked when caller would eliminate the **last** pooled super-admin.
 * - Removing **`admin`** forbidden while **`super_admin`** remains (keep ladder coherent — strip super-admin first).
 * - Removing **`customer`** discouraged for unknown unknowns → still allowed operator override for recovery.
 * - **`super_admin` add**: ensures **`admin`** membership first (idempotent duplicate adds).
 */
export async function applyOperationalIdentityGroupChange(
  input: ApplyOperationalGroupChangeInput
): Promise<ApplyOperationalGroupChangeResult> {
  const sub = input.targetCognitoSub.trim();
  if (!sub) return { ok: false, code: "missing_target_sub", status: 400 };

  const gn = input.groupName;
  if (!GROUP_SET.has(gn)) {
    return { ok: false, code: "unsupported_group", status: 400, message: "Only customer | admin | super_admin." };
  }

  const envelope = await resolveOperationalPoolUserBySub(input.cfg, sub);
  if (!envelope) {
    return { ok: false, code: "target_not_found", status: 404, message: "Cognito user could not be resolved." };
  }

  const cognitoUsername = envelope.username;

  const beforeGroups = await adminListAssignedGroupsForUser(input.cfg, cognitoUsername);
  const has = beforeGroups.includes(gn);

  if (input.action === "add") {
    if (has)
      return { ok: false, code: "already_member", status: 409, message: `${gn} already assigned.` };
  } else {
    if (!has) return { ok: false, code: "not_member", status: 409, message: `${gn} not assigned.` };

    if (gn === "admin" && beforeGroups.includes("super_admin")) {
      return {
        ok: false,
        code: "strip_super_admin_first",
        status: 400,
        message: "Remove super_admin before admin while super_admin remains.",
      };
    }

    if (gn === "super_admin" && input.actor.sub === envelope.sub && beforeGroups.includes("super_admin")) {
      const expected = input.actor.email?.trim().toLowerCase() ?? "";
      const ack = input.selfDemotionAckEmail?.trim().toLowerCase() ?? "";
      if (!expected || ack !== expected) {
        return {
          ok: false,
          code: "confirmation_required",
          status: 400,
          message: "Type your account email exactly to confirm self-removal from super_admin.",
        };
      }
    }

    if (gn === "super_admin") {
      const totalSupers = await adminCountUsersInPoolGroup(input.cfg, "super_admin");
      if (totalSupers <= 1 && beforeGroups.includes("super_admin")) {
        return {
          ok: false,
          code: "last_super_admin",
          status: 400,
          message: "Cannot drop the final super-admin. Promote another operator first.",
        };
      }
    }
  }

  try {
    if (input.action === "add") {
      if (gn === "super_admin" && !beforeGroups.includes("admin")) {
        await adminAddUserToGroup(input.cfg, { username: cognitoUsername, groupName: "admin" });
      }
      await adminAddUserToGroup(input.cfg, { username: cognitoUsername, groupName: gn });
    } else {
      await adminRemoveUserFromPoolGroup(input.cfg, { username: cognitoUsername, groupName: gn });
    }
  } catch {
    await recordGovernanceAuditEntry({
      actionType: "OPERATIONS_IDENTITY_ROLE_MEMBERSHIP_CHANGE",
      category: "access",
      actorId: input.actor.sub,
      actorName: input.actor.email?.trim() || input.actor.username?.trim() || input.actor.sub,
      actorRole: "super_admin",
      targetType: "cognito_user",
      targetId: envelope.sub,
      targetName: envelope.email?.trim().toLowerCase() ?? cognitoUsername,
      description: `FAILED ${input.action} ${gn}`,
      metadata: {
        beforeGroups,
        afterGroups: beforeGroups,
        target: { sub: envelope.sub, username: cognitoUsername, email: envelope.email },
        actor: { sub: input.actor.sub, email: input.actor.email },
        action: input.action,
        groupName: gn,
        phase: "cognitoMutationError",
      },
      ipAddress: clientIpFromRequest(input.request),
    });
    return {
      ok: false,
      code: "cognito_error",
      status: 502,
      message: "Cognito rejected the membership change — check IAM + pool wiring.",
    };
  }

  const afterGroups = await adminListAssignedGroupsForUser(input.cfg, cognitoUsername);

  const actorName = input.actor.email?.trim() || input.actor.username?.trim() || input.actor.sub;

  await recordGovernanceAuditEntry({
    actionType: "OPERATIONS_IDENTITY_ROLE_MEMBERSHIP_CHANGE",
    category: "access",
    actorId: input.actor.sub,
    actorName,
    actorRole: "super_admin",
    targetType: "cognito_user",
    targetId: envelope.sub,
    targetName: envelope.email?.trim().toLowerCase() ?? cognitoUsername,
    description: `${input.action} ${gn}`,
    metadata: {
      beforeGroups,
      afterGroups,
      target: { sub: envelope.sub, username: cognitoUsername, email: envelope.email },
      actor: { sub: input.actor.sub, email: input.actor.email },
      action: input.action,
      groupName: gn,
      phase: "applied",
    },
    ipAddress: clientIpFromRequest(input.request),
  });

  return { ok: true, beforeGroups, afterGroups, cognitoUsername };
}
