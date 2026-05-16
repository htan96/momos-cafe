import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { OperationalActivitySeverity } from "@prisma/client";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { prisma } from "@/lib/prisma";
import {
  GOVERNANCE_CONTROL_DEFINITIONS,
  GOVERNANCE_CONTROL_KEYS,
  type GovernanceControlKey,
} from "@/lib/governance/controlKeys";
import {
  ensureGovernanceControls,
  GOVERNANCE_CONTROLS_CACHE_TAG,
} from "@/lib/governance/governanceControls";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";
import { emitOperationalEvent } from "@/lib/operations/emitOperationalEvent";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { ensureDefaultAppSettings, MAINTENANCE_CACHE_TAG } from "@/lib/app-settings/settings";
import { syncAppSettingsFromGovernanceState } from "@/lib/governance/syncGovernanceAppSettings";

function isGovernanceKey(key: string): key is GovernanceControlKey {
  return (GOVERNANCE_CONTROL_KEYS as readonly string[]).includes(key);
}

export async function GET() {
  const user = await getCognitoServerSession();
  if (!user?.groups || !isSuperAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  await ensureGovernanceControls();
  const rows = await prisma.platformGovernanceControl.findMany({
    where: { key: { in: [...GOVERNANCE_CONTROL_KEYS] } },
    orderBy: { key: "asc" },
  });

  const controls = rows.map((row) => {
    const def = GOVERNANCE_CONTROL_DEFINITIONS[row.key as GovernanceControlKey];
    return {
      key: row.key,
      category: row.category,
      title: def?.title ?? row.key,
      description: row.description ?? def?.description ?? null,
      enabled: row.enabled,
      updatedAt: row.updatedAt.toISOString(),
      lastModifiedBy: row.lastModifiedBy,
      value: row.value,
      metadata: row.metadata,
    };
  });

  return NextResponse.json({ controls });
}

export async function PATCH(request: Request) {
  const user = await getCognitoServerSession();
  if (!user?.groups || !isSuperAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { updates: rawUpdates } = body as { updates?: unknown };
  if (!rawUpdates || typeof rawUpdates !== "object") {
    return NextResponse.json(
      { error: "updates_required", message: "Body must include updates object" },
      { status: 400 }
    );
  }

  const entries = Object.entries(rawUpdates).filter(([_, v]) => v !== undefined);
  if (entries.length === 0) {
    return NextResponse.json(
      { error: "no_updates", message: "Provide at least one control key to update." },
      { status: 400 }
    );
  }

  for (const [k, v] of entries) {
    if (!isGovernanceKey(k)) {
      return NextResponse.json({ error: `unknown_control_key:${k}` }, { status: 400 });
    }
    if (typeof v !== "boolean") {
      return NextResponse.json({ error: `control_value_must_be_boolean:${k}` }, { status: 400 });
    }
  }

  await ensureDefaultAppSettings();
  await ensureGovernanceControls();

  const updatedBy = user.email ?? user.username ?? user.sub;

  await prisma.$transaction(async (tx) => {
    for (const [key, enabled] of entries as [GovernanceControlKey, boolean][]) {
      await tx.platformGovernanceControl.update({
        where: { key },
        data: { enabled, lastModifiedBy: updatedBy },
      });
      const def = GOVERNANCE_CONTROL_DEFINITIONS[key];
      await recordGovernanceAuditEntry({
        tx,
        actionType: "GOVERNANCE_CONTROL_UPDATED",
        category: def.category,
        actorId: user.sub,
        actorName: updatedBy,
        actorRole: "super_admin",
        targetType: "governance_control",
        targetId: key,
        targetName: def.title,
        description: `Governance control "${def.title}" set to ${enabled ? "on" : "off"}`,
        metadata: { key, enabled, source: "api.super-admin.governance-controls" },
      });
    }

    const synced = await tx.platformGovernanceControl.findMany({
      where: { key: { in: ["maintenance_mode", "menu_hidden"] } },
      select: { key: true, enabled: true },
    });
    const maintenanceMode = synced.find((r) => r.key === "maintenance_mode")?.enabled ?? false;
    const menuHidden = synced.find((r) => r.key === "menu_hidden")?.enabled ?? false;
    await syncAppSettingsFromGovernanceState(tx, { maintenanceMode, menuHidden, actorLabel: updatedBy });
  });

  await emitOperationalEvent({
    type: OPERATIONAL_EVENT_TYPES.GOVERNANCE_CONTROL_UPDATED,
    severity: OperationalActivitySeverity.warning,
    actorType: "super_admin",
    actorId: user.sub,
    message: `Governance controls updated (${entries.length} key${entries.length === 1 ? "" : "s"})`,
    metadata: { changes: entries.map(([key, enabled]) => ({ key, enabled })) },
    source: "api.super-admin.governance-controls",
  });

  revalidateTag(GOVERNANCE_CONTROLS_CACHE_TAG, "max");
  revalidateTag(MAINTENANCE_CACHE_TAG, "max");

  const nextRows = await prisma.platformGovernanceControl.findMany({
    where: { key: { in: [...GOVERNANCE_CONTROL_KEYS] } },
    orderBy: { key: "asc" },
  });

  return NextResponse.json({
    ok: true,
    controls: nextRows.map((row) => {
      const def = GOVERNANCE_CONTROL_DEFINITIONS[row.key as GovernanceControlKey];
      return {
        key: row.key,
        category: row.category,
        title: def?.title ?? row.key,
        description: row.description ?? def?.description ?? null,
        enabled: row.enabled,
        updatedAt: row.updatedAt.toISOString(),
        lastModifiedBy: row.lastModifiedBy,
        value: row.value,
        metadata: row.metadata,
      };
    }),
  });
}
