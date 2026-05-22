import { NextResponse } from "next/server";
import { OperationalActivitySeverity } from "@prisma/client";
import {
  governanceAuditActorForSuperStaff,
  resolveSuperStaffDelegation,
} from "@/lib/auth/cognito/requireSuperStaff";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { buildSyntheticSquarePaymentWebhookBody } from "@/lib/payments/buildSyntheticSquarePaymentWebhook";
import { reconcileSquarePaymentWebhook } from "@/lib/payments/commercePaymentOrchestration";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { prisma } from "@/lib/prisma";
import { createSquareClientFromEnv } from "@/lib/square/catalogDiscovery";
import { jsonError } from "@/lib/server/apiErrors";
import { rateLimitHit } from "@/lib/server/rateLimitMemory";

type LookupBody = {
  squarePaymentId?: string | null;
  paymentRecordId?: string | null;
  commerceOrderId?: string | null;
  /** Optional OperationalActivityEvent id that triggered retries (audit metadata only). */
  sourceFailureEventId?: string | null;
};

function normalizeBody(raw: unknown): LookupBody | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  return {
    squarePaymentId: typeof o.squarePaymentId === "string" ? o.squarePaymentId : null,
    paymentRecordId: typeof o.paymentRecordId === "string" ? o.paymentRecordId : null,
    commerceOrderId: typeof o.commerceOrderId === "string" ? o.commerceOrderId : null,
    sourceFailureEventId: typeof o.sourceFailureEventId === "string" ? o.sourceFailureEventId : null,
  };
}

export async function POST(req: Request) {
  const delegation = await resolveSuperStaffDelegation();
  if (!delegation.jwtUser || !isSuperAdmin(delegation.authorityGroups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }
  const auditActor =
    governanceAuditActorForSuperStaff(delegation) ?? {
      actorId: delegation.jwtUser.sub,
      actorName: delegation.jwtUser.email ?? delegation.jwtUser.username ?? "",
    };
  const actorSub = auditActor.actorId;
  const actorLabel = auditActor.actorName.trim() || actorSub;

  if (rateLimitHit(`square:payment_lookup:${actorSub}`, { windowMs: 300_000, max: 12 })) {
    return jsonError(429, "RATE_LIMITED", "Too many payment lookup reconcile requests — wait a few minutes.");
  }

  let body: LookupBody | null = null;
  try {
    body = normalizeBody(await req.json());
  } catch {
    body = null;
  }
  if (!body) {
    return jsonError(400, "BAD_JSON", "Expected JSON body.");
  }

  let squarePaymentId = body.squarePaymentId?.trim();

  if (!squarePaymentId && body.paymentRecordId?.trim()) {
    const pr = await prisma.paymentRecord.findUnique({
      where: { id: body.paymentRecordId.trim() },
      select: { squarePaymentId: true },
    });
    squarePaymentId = pr?.squarePaymentId?.trim() ?? undefined;
  }

  if (!squarePaymentId && body.commerceOrderId?.trim()) {
    const pr = await prisma.paymentRecord.findFirst({
      where: { orderId: body.commerceOrderId.trim(), provider: "square" },
      orderBy: { updatedAt: "desc" },
      select: { squarePaymentId: true },
    });
    squarePaymentId = pr?.squarePaymentId?.trim() ?? undefined;
  }

  if (!squarePaymentId) {
    return jsonError(400, "MISSING_PAYMENT_TARGET", "Provide squarePaymentId, paymentRecordId, or commerceOrderId.");
  }

  void emitPlatformEvent({
    subtype: PLATFORM_EVENT_SUBTYPE.PAYMENT_SUPER_ADMIN_SQUARE_LOOKUP,
    category: "PAYMENT_EVENT",
    lifecycle: "processing",
    severity: OperationalActivitySeverity.info,
    actorType: "super_admin",
    actorId: actorSub,
    actorName: actorLabel,
    message: "Square payment lookup recovery started (GET payment + local reconcile)",
    detail: {
      squarePaymentId,
      sourceFailureEventId: body.sourceFailureEventId ?? undefined,
    },
    correlation: {},
    entities: {},
    source: { handler: "POST super-admin/recovery/square-payment-lookup" },
    sourceTag: "api.super-admin.operations.recovery.square-payment-lookup",
  });

  try {
    const client = createSquareClientFromEnv();
    const rawGet = await client.payments.get({ paymentId: squarePaymentId });
    const webhookBody = buildSyntheticSquarePaymentWebhookBody(rawGet);
    const result = await reconcileSquarePaymentWebhook(webhookBody);

    await recordGovernanceAuditEntry({
      actionType: "OPERATIONS_SQUARE_PAYMENT_LOOKUP_RECONCILE",
      category: "operations",
      actorId: actorSub,
      actorName: actorLabel,
      actorRole: "super_admin",
      description: "Super-admin reran reconcile from Square GET payment payload",
      metadata: {
        ok: true,
        squarePaymentId,
        sourceFailureEventId: body.sourceFailureEventId ?? undefined,
        reconcile: result,
      },
    });

    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.PAYMENT_SUPER_ADMIN_SQUARE_LOOKUP,
      category: "PAYMENT_EVENT",
      lifecycle: result.orphanEmitted ? "failed" : "succeeded",
      severity: result.orphanEmitted ? OperationalActivitySeverity.warning : OperationalActivitySeverity.info,
      actorType: "super_admin",
      actorId: actorSub,
      actorName: actorLabel,
      message: result.orphanEmitted
        ? "Square payment lookup recovery finished — reconcile reported orphan webhook path"
        : "Square payment lookup recovery finished",
      detail: {
        squarePaymentId,
        sourceFailureEventId: body.sourceFailureEventId ?? undefined,
        reconcile: result,
      },
      entities: {
        commerceOrderId: result.commerceOrderId ?? undefined,
        paymentRecordId: result.paymentRecordId ?? undefined,
      },
      source: { handler: "POST super-admin/recovery/square-payment-lookup" },
      sourceTag: "api.super-admin.operations.recovery.square-payment-lookup",
    });

    return NextResponse.json({ ok: true, squarePaymentId, reconcile: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[super-admin/square-payment-lookup]", e);
    await recordGovernanceAuditEntry({
      actionType: "OPERATIONS_SQUARE_PAYMENT_LOOKUP_RECONCILE",
      category: "operations",
      actorId: actorSub,
      actorName: actorLabel,
      actorRole: "super_admin",
      description: `Super-admin square payment lookup failed (${msg.slice(0, 160)})`,
      metadata: {
        ok: false,
        squarePaymentId,
        sourceFailureEventId: body.sourceFailureEventId ?? undefined,
        error: msg.slice(0, 400),
      },
    });
    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.PAYMENT_SUPER_ADMIN_SQUARE_LOOKUP,
      category: "PAYMENT_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.error,
      actorType: "super_admin",
      actorId: actorSub,
      actorName: actorLabel,
      message: "Square payment lookup recovery failed",
      detail: {
        squarePaymentId,
        sourceFailureEventId: body.sourceFailureEventId ?? undefined,
        error: msg.slice(0, 280),
      },
      source: { handler: "POST super-admin/recovery/square-payment-lookup" },
      sourceTag: "api.super-admin.operations.recovery.square-payment-lookup",
    });
    return jsonError(500, "SQUARE_PAYMENT_LOOKUP_FAILED", msg.slice(0, 280));
  }
}
