import { NextResponse } from "next/server";
import type { CognitoGroup } from "@/lib/auth/cognito/types";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { governanceLayoutPrincipalUser } from "@/lib/auth/cognito/staffDelegatedAuthority";
import {
  requireSuperStaffJson,
  resolveSuperStaffDelegation,
} from "@/lib/auth/cognito/requireSuperStaff";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { resolveOperationalIdentityBundle } from "@/lib/super-admin/operationalIdentity/resolveOperationalIdentity";
import { applyOperationalIdentityGroupChange } from "@/lib/super-admin/operationalIdentity/applyOperationalIdentityGroupChange";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";
import { clientIpFromRequest } from "@/lib/governance/impersonationRequestMeta";

export const runtime = "nodejs";

const COGNITO_GROUPS = new Set<string>(["customer", "admin", "super_admin"]);

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperStaffJson();
  if (gate) return gate;

  const { id } = await ctx.params;
  const key = decodeURIComponent(typeof id === "string" ? id.trim() : "");
  const bundle = await resolveOperationalIdentityBundle(key);
  if (!bundle) {
    return NextResponse.json({ error: "not_found", code: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(bundle);
}

type PostBody = {
  targetCognitoSub?: string;
  groupName?: string;
  action?: string;
  dangerConfirm?: boolean;
  confirmToken?: string;
  /** Present when shedding your own **`super_admin`** membership. Mirrors staff-role PATCH. */
  selfDemotionAckEmail?: string | null;
};

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperStaffJson();
  if (gate) return gate;

  const delegation = await resolveSuperStaffDelegation();
  if (!delegation.jwtUser || !isSuperAdmin(delegation.authorityGroups)) {
    return NextResponse.json({ error: "forbidden", code: "SUPER_ADMIN_REQUIRED" }, { status: 403 });
  }
  const user = governanceLayoutPrincipalUser(delegation.jwtUser, delegation.impersonation);

  const cfg = getCognitoConfig();
  const { id: routeSegment } = await ctx.params;

  let bodyUnknown: unknown;
  try {
    bodyUnknown = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const body = (bodyUnknown && typeof bodyUnknown === "object" ? bodyUnknown : {}) as PostBody;

  const mutationConfirmed =
    body.dangerConfirm === true ||
    body.confirmToken === "OPERATIONS_IDENTITY_GROUP_CHANGE_V1";

  if (!mutationConfirmed) {
    return NextResponse.json(
      { error: "danger_confirm_required", code: "DANGER_CONFIRM_REQUIRED" },
      { status: 400 }
    );
  }

  const targetCognitoSubRaw =
    typeof body.targetCognitoSub === "string" && body.targetCognitoSub.trim() ?
      body.targetCognitoSub.trim()
    : decodeURIComponent(routeSegment.trim());

  const gnRaw = typeof body.groupName === "string" ? body.groupName.trim() : "";
  if (!COGNITO_GROUPS.has(gnRaw)) {
    return NextResponse.json({ error: "invalid_group_name" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (action !== "add" && action !== "remove") {
    return NextResponse.json({ error: "invalid_action", message: 'action must be "add" or "remove".' }, { status: 400 });
  }

  if (!cfg) {
    await recordGovernanceAuditEntry({
      actionType: "OPERATIONS_IDENTITY_ROLE_MEMBERSHIP_CHANGE",
      category: "access",
      actorId: user.sub,
      actorName: user.email?.trim() || user.username?.trim() || user.sub,
      actorRole: "super_admin",
      targetType: "cognito_user",
      targetId: targetCognitoSubRaw,
      targetName: targetCognitoSubRaw,
      description: "blocked — Cognito env missing",
      metadata: {
        beforeGroups: [],
        afterGroups: [],
        actor: { sub: user.sub, email: user.email },
        attempted: { action, groupName: gnRaw },
        phase: "cognito_unconfigured",
      },
      ipAddress: clientIpFromRequest(request),
    });
    return NextResponse.json({ error: "cognito_unconfigured", code: "COGNITO_UNCONFIGURED" }, { status: 503 });
  }

  const out = await applyOperationalIdentityGroupChange({
    cfg,
    request,
    actor: {
      sub: user.sub,
      email: user.email ?? null,
      username: user.username ?? null,
    },
    targetCognitoSub: targetCognitoSubRaw,
    groupName: gnRaw as CognitoGroup,
    action,
    selfDemotionAckEmail: body.selfDemotionAckEmail ?? null,
  });

  if (!out.ok) {
    return NextResponse.json({ error: out.code, message: out.message }, { status: out.status });
  }

  return NextResponse.json({
    ok: true,
    beforeGroups: out.beforeGroups,
    afterGroups: out.afterGroups,
    cognitoUsername: out.cognitoUsername,
    refreshHint: `/api/super-admin/operations/operational-identity/${encodeURIComponent(targetCognitoSubRaw)}`,
  });
}
