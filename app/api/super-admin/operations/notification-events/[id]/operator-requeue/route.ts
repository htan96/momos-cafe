/**
 * Operator-only controls for Postgres `notification_events`.
 *
 * **Paths / retry semantics (do not change without aligning cron + processor docs):**
 * - Normal retries: `/api/internal/cron/notification-outbox` clears stale `started_processing_at` (>15 min) automatically,
 *   then claims rows via lease + persists `_process.attempts`.
 * - **Phase A (`lease_release`):** POST here clears `started_processing_at` ONLY when `processed_at` stays null AND
 *   `(lease stale >15min OR caller sets confirmRequeueStaleLease)`. Use when infra paused cron or a zombie worker held a lease.
 * - **Phase B (`dead_letter_rewind`):** Only for attempt-cap terminals — requires explicit `dangerConfirmResetDeadLetter`
 *   (see {@link isDeadLetterAttemptCapRow}), clears `processed_at`, strips critical `_process` bookkeeping, audited.
 *   **Risk:** SES / provider might have already accepted the send — rewind can enqueue a duplicate outbound attempt.
 */

import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  governanceAuditActorForSuperStaff,
  requireSuperStaffJson,
  resolveSuperStaffDelegation,
} from "@/lib/auth/cognito/requireSuperStaff";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/server/apiErrors";
import {
  isDeadLetterAttemptCapRow,
  notificationOutboundLeaseIsStaleHeld,
} from "@/lib/super-admin/notifications/deriveNotificationLifecycleState";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type OperatorBody = {
  /** Bypass stale-only guard while `processed_at` is null — use when infra must forcibly detach a stuck fresh lease (rare). */
  confirmRequeueStaleLease?: boolean;
  /** Phase B unlock — rewinds attempt-cap terminals (see handler comment risks). */
  dangerConfirmResetDeadLetter?: boolean;
};

function stripProcessForDeadLetterRewind(payload: unknown): Prisma.InputJsonValue {
  const base =
    payload && typeof payload === "object" && !Array.isArray(payload) ? { ...(payload as Record<string, unknown>) } : {};
  const prevMeta = base._process;
  let cleanedMeta: Record<string, unknown>;
  if (prevMeta && typeof prevMeta === "object" && !Array.isArray(prevMeta)) {
    cleanedMeta = { ...(prevMeta as Record<string, unknown>) };
    delete cleanedMeta.attempts;
    delete cleanedMeta.delivery_attempt;
    delete cleanedMeta.lastError;
    delete cleanedMeta.lastErrorCode;
    delete cleanedMeta.lastAttemptAt;
    delete cleanedMeta.processing_started_at;
    delete cleanedMeta.last_provider_message_id;
  } else {
    cleanedMeta = {};
  }
  if ("provider_message_id" in base) {
    delete (base as Record<string, unknown>).provider_message_id;
  }
  return { ...base, _process: cleanedMeta } as Prisma.InputJsonValue;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperStaffJson();
  if (gate) return gate;

  const delegation = await resolveSuperStaffDelegation();
  if (!delegation.jwtUser || !isSuperAdmin(delegation.authorityGroups)) {
    return jsonError(403, "FORBIDDEN", "Super admin session required.");
  }

  const auditActor =
    governanceAuditActorForSuperStaff(delegation) ?? {
      actorId: delegation.jwtUser.sub,
      actorName: delegation.jwtUser.email ?? delegation.jwtUser.username ?? "",
    };

  const { id } = await ctx.params;
  const trimmedId = typeof id === "string" ? id.trim() : "";
  if (!UUID_RE.test(trimmedId)) return jsonError(400, "BAD_ID", "NotificationEvent id UUID required.");

  let body: OperatorBody | null = null;
  try {
    body = (await req.json()) as OperatorBody;
  } catch {
    body = null;
  }

  const confirmRequeue = body?.confirmRequeueStaleLease === true;
  const dangerDeadLetter = body?.dangerConfirmResetDeadLetter === true;

  const row = await prisma.notificationEvent.findUnique({
    where: { id: trimmedId },
    select: { id: true, processedAt: true, startedProcessingAt: true, payload: true, type: true },
  });
  if (!row) return jsonError(404, "NOT_FOUND", "NotificationEvent not found.");

  const now = new Date();

  if (dangerDeadLetter) {
    if (!row.processedAt) {
      return jsonError(409, "NOT_TERMINAL", "Dead-letter rewind requires a processed terminal row.");
    }
    if (!isDeadLetterAttemptCapRow(row)) {
      return jsonError(
        409,
        "NOT_DEAD_LETTER_ATTEMPT_CAP",
        "Dead-letter rewind is limited to rows that hit outbound attempt bookkeeping cap / attempt_cap code."
      );
    }

    const nextPayload = stripProcessForDeadLetterRewind(row.payload);

    await prisma.notificationEvent.update({
      where: { id: row.id },
      data: {
        processedAt: null,
        startedProcessingAt: null,
        payload: nextPayload,
      },
    });

    await recordGovernanceAuditEntry({
      actionType: "OPERATIONS_NOTIFICATION_EVENT_OPERATOR_REQUEUE",
      actorId: auditActor.actorId,
      actorName: auditActor.actorName,
      actorRole: "super_admin",
      targetType: "notification_event",
      targetId: row.id,
      description:
        "Operator rewind — attempt-cap NotificationEvent reopened (processed_at cleared, _process delivery bookkeeping stripped)",
      metadata: {
        mode: "dead_letter_rewind",
        notificationType: row.type,
        risk_duplicate_outbound_delivery: true,
      },
    });

    return NextResponse.json({
      ok: true,
      mode: "dead_letter_rewind",
      id: row.id,
      acknowledgedRisk: true,
      note:
        "Row is pending again; cron may duplicate sends if SES already succeeded — verify dashboards before approving replays.",
    });
  }

  /** Phase A — stale lease detach */
  if (row.processedAt) {
    return jsonError(
      409,
      "ALREADY_PROCESSED",
      "Lease release targets unprocessed rows only — use Phase B workflow for guarded dead-letter rewind."
    );
  }

  if (!row.startedProcessingAt) {
    return jsonError(409, "NO_ACTIVE_LEASE", "Nothing to clear — `started_processing_at` already null.");
  }

  const leaseStale = notificationOutboundLeaseIsStaleHeld(row.startedProcessingAt, now);
  const allowed = leaseStale || confirmRequeue;

  if (!allowed) {
    return jsonError(
      409,
      "FRESH_PROCESSING_LEASE",
      'Lease still fresh (<15 minutes). Retry after staleness horizon or POST with `"confirmRequeueStaleLease": true`.'
    );
  }

  /** Double-path OK: stale lease clears without confirm; fresh lease clears only with confirm. */

  await prisma.notificationEvent.update({
    where: { id: row.id },
    data: { startedProcessingAt: null },
  });

  await recordGovernanceAuditEntry({
    actionType: "OPERATIONS_NOTIFICATION_EVENT_OPERATOR_REQUEUE",
    actorId: auditActor.actorId,
    actorName: auditActor.actorName,
    actorRole: "super_admin",
    targetType: "notification_event",
    targetId: row.id,
    description: leaseStale ?
      "NotificationEvent stale processing lease cleared (operator / automation)"
    : "NotificationEvent processing lease forcibly cleared (operator confirmed)",
    metadata: {
      mode: "lease_release",
      notificationType: row.type,
      confirmRequeueStaleLeaseUsed: confirmRequeue,
      leaseStale,
    },
  });

  return NextResponse.json({
    ok: true,
    mode: "lease_release",
    id: row.id,
    staleLeaseDetached: leaseStale,
  });
}
