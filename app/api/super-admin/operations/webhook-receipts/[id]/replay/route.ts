import { NextResponse } from "next/server";
import { WebhookProcessingStatus } from "@prisma/client";
import {
  governanceAuditActorForSuperStaff,
  requireSuperStaffJson,
  resolveSuperStaffDelegation,
} from "@/lib/auth/cognito/requireSuperStaff";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { recordGovernanceAuditEntry } from "@/lib/governance/governanceAuditRecord";
import { prisma } from "@/lib/prisma";
import { sha256HexUtf8 } from "@/lib/webhooks/payloadHash";
import { buildOperationalWebhookReplayPlan } from "@/lib/super-admin/operations/webhookReplay/buildOperationalWebhookReplayPlan";
import { recordOperationalWebhookReplayAudit } from "@/lib/super-admin/operations/webhookReplay/recordOperationalWebhookReplayAudit";
import { replayWebhookSignatureVerification } from "@/lib/super-admin/operations/webhookReplay/replayWebhookVerification";
import {
  executeOperationalShippoWebhookReplay,
  executeOperationalSquareWebhookReplay,
} from "@/lib/super-admin/operations/webhookReplay/webhookReplayExecute";
import { jsonError } from "@/lib/server/apiErrors";

export const runtime = "nodejs";

const CUIDISH = /^[a-z][a-z0-9_-]{15,}$/i;

type ReplayBody = {
  dryRun?: boolean;
  confirm?: boolean;
  rawBody?: unknown;
  signatureHeader?: unknown;
  forceReconcile?: boolean;
};

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
  if (!CUIDISH.test(id)) return jsonError(400, "BAD_ID", "Receipt id missing or malformed.");

  let body: ReplayBody | null = null;
  try {
    body = (await req.json()) as ReplayBody;
  } catch {
    body = null;
  }
  if (!body || typeof body !== "object") return jsonError(400, "BAD_JSON", "Expected JSON body.");

  const drying = body.dryRun === true;
  const executing = body.confirm === true && body.dryRun !== true;

  if (drying && body.confirm === true) {
    return jsonError(400, "CONFLICT_MODE", "Dry run cannot combine with confirm in the same request.");
  }

  if (!drying && !executing) {
    return jsonError(400, "NEED_ACTION", 'Set `"dryRun": true` for a plan preview, or `"confirm": true` with `"dryRun": false` / omitted to execute.');
  }

  if (typeof body.rawBody !== "string" || body.rawBody.trim().length === 0) {
    return jsonError(400, "RAW_BODY_REQUIRED", "Paste vendor JSON (`rawBody` string). Receipts omit raw payloads.");
  }

  const rawBody = body.rawBody.trim();

  const receipt = await prisma.webhookDeliveryReceipt.findUnique({ where: { id } });
  if (!receipt) return jsonError(404, "NOT_FOUND", "Webhook delivery receipt not found.");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    await recordOperationalWebhookReplayAudit({
      receiptId: id,
      provider: receipt.provider,
      dryRun: drying,
      confirmed: executing,
      actorSub: auditActor.actorId,
      actorEmail: delegation.jwtUser.email ?? delegation.jwtUser.username ?? null,
      outcome: "error",
      detail: { stage: "parse_json", error: "invalid_json" },
    });
    await recordGovernanceAuditEntry({
      actionType: "OPERATIONS_WEBHOOK_RECEIPT_REPLAY",
      actorId: auditActor.actorId,
      actorName: auditActor.actorName,
      actorRole: "super_admin",
      targetType: "webhook_delivery_receipt",
      targetId: id,
      description: "Webhook replay failed — pasted body was not valid JSON",
      metadata: { phase: drying ? "dry_run" : "execute", receiptId: id },
    });
    return jsonError(400, "INVALID_JSON", "Pasted `rawBody` was not valid JSON.");
  }

  const replayableProviders = ["square", "shippo"];
  if (!replayableProviders.includes(receipt.provider)) {
    await recordOperationalWebhookReplayAudit({
      receiptId: id,
      provider: receipt.provider,
      dryRun: drying,
      confirmed: executing,
      actorSub: auditActor.actorId,
      actorEmail: delegation.jwtUser.email ?? delegation.jwtUser.username ?? null,
      outcome: "error",
      detail: {
        code: "PROVIDER_UNSUPPORTED",
        note:
          receipt.provider === "resend" ?
            "SES / Resend inbound receipts have no stored raw body — inspect provider dashboards; replay needs operator-pasted JSON when available."
          : "Operational replay tooling only wires Square payments + Shippo tracking payloads today.",
      },
    });
    await recordGovernanceAuditEntry({
      actionType: "OPERATIONS_WEBHOOK_RECEIPT_REPLAY",
      actorId: auditActor.actorId,
      actorName: auditActor.actorName,
      actorRole: "super_admin",
      targetType: "webhook_delivery_receipt",
      targetId: id,
      description: `Webhook replay unsupported for provider (${receipt.provider})`,
      metadata: { receiptId: id, phase: drying ? "dry_run" : "execute" },
    });
    return jsonError(400, "PROVIDER_UNSUPPORTED", "Replay tooling only executes Square payment + Shippo tracking payloads.");
  }

  const sigHeader =
    typeof body.signatureHeader === "string" && body.signatureHeader.trim().length > 0 ? body.signatureHeader.trim() : null;

  const payloadHashNew = sha256HexUtf8(rawBody);
  const verification = await replayWebhookSignatureVerification({
    provider: receipt.provider,
    rawBody,
    signatureHeader: sigHeader,
  });

  if (drying) {
    const plan = await buildOperationalWebhookReplayPlan({
      provider: receipt.provider,
      body: parsed,
    });
    await recordOperationalWebhookReplayAudit({
      receiptId: id,
      provider: receipt.provider,
      dryRun: true,
      confirmed: false,
      actorSub: auditActor.actorId,
      actorEmail: delegation.jwtUser.email ?? delegation.jwtUser.username ?? null,
      outcome: "dry_run_only",
      detail: { verification, planSummary: plan, payloadHashNew },
    });
    await recordGovernanceAuditEntry({
      actionType: "OPERATIONS_WEBHOOK_RECEIPT_REPLAY",
      actorId: auditActor.actorId,
      actorName: auditActor.actorName,
      actorRole: "super_admin",
      targetType: "webhook_delivery_receipt",
      targetId: id,
      description: "Operational webhook replay — dry-run plan generated",
      metadata: { receiptId: id, provider: receipt.provider, phase: "dry_run", verification },
    });

    return NextResponse.json({
      dryRun: true,
      receiptId: id,
      provider: receipt.provider,
      verification,
      payloadHash: payloadHashNew,
      plan,
    });
  }

  const forceReconcile = body.forceReconcile === true;
  if (verification.required && verification.status !== "verified") {
    await recordOperationalWebhookReplayAudit({
      receiptId: id,
      provider: receipt.provider,
      dryRun: false,
      confirmed: true,
      actorSub: auditActor.actorId,
      actorEmail: delegation.jwtUser.email ?? delegation.jwtUser.username ?? null,
      outcome: "error",
      detail: {
        verification,
        code: verification.status === "invalid_signature" ? "INVALID_SIGNATURE" : "SIGNATURE_REQUIRED",
      },
    });
    await recordGovernanceAuditEntry({
      actionType: "OPERATIONS_WEBHOOK_RECEIPT_REPLAY",
      actorId: auditActor.actorId,
      actorName: auditActor.actorName,
      actorRole: "super_admin",
      targetType: "webhook_delivery_receipt",
      targetId: id,
      description: "Webhook replay blocked — signature verification failed or header missing while secrets are configured",
      metadata: { receiptId: id, provider: receipt.provider, verification },
    });
    return jsonError(
      400,
      verification.status === "invalid_signature" ? "INVALID_SIGNATURE" : "SIGNATURE_REQUIRED",
      verification.status === "invalid_signature" ?
        "Signature header did not match pasted body."
      : "Signature header required when webhook verification secrets are configured."
    );
  }

  if (
    receipt.processingStatus === WebhookProcessingStatus.processed &&
    receipt.payloadHash &&
    receipt.payloadHash === payloadHashNew &&
    !forceReconcile
  ) {
    await recordOperationalWebhookReplayAudit({
      receiptId: id,
      provider: receipt.provider,
      dryRun: false,
      confirmed: true,
      actorSub: auditActor.actorId,
      actorEmail: delegation.jwtUser.email ?? delegation.jwtUser.username ?? null,
      outcome: "skipped",
      detail: { reason: "already_processed_same_hash", payloadHash: payloadHashNew },
    });
    await recordGovernanceAuditEntry({
      actionType: "OPERATIONS_WEBHOOK_RECEIPT_REPLAY",
      actorId: auditActor.actorId,
      actorName: auditActor.actorName,
      actorRole: "super_admin",
      targetType: "webhook_delivery_receipt",
      targetId: id,
      description: "Webhook replay skipped — receipt already processed with identical payload hash",
      metadata: { receiptId: id, provider: receipt.provider, payloadHash: payloadHashNew },
    });
    return NextResponse.json(
      {
        error: "already processed — no-op",
        code: "REPLAY_DUPLICATE_HASH",
        receiptId: id,
        payloadHash: payloadHashNew,
      },
      { status: 409 }
    );
  }

  if (
    forceReconcile &&
    receipt.processingStatus === WebhookProcessingStatus.processed &&
    receipt.payloadHash === payloadHashNew
  ) {
    await recordGovernanceAuditEntry({
      actionType: "OPERATIONS_WEBHOOK_RECEIPT_REPLAY_FORCE",
      actorId: auditActor.actorId,
      actorName: auditActor.actorName,
      actorRole: "super_admin",
      targetType: "webhook_delivery_receipt",
      targetId: id,
      description: "Forced duplicate webhook replay — processed receipt + matching hash",
      metadata: { receiptId: id, provider: receipt.provider, payloadHash: payloadHashNew },
    });
  }

  try {
    if (receipt.provider === "square") {
      const result = await executeOperationalSquareWebhookReplay({
        receiptId: id,
        body: parsed,
        newPayloadHash: payloadHashNew,
        verification,
      });
      await recordOperationalWebhookReplayAudit({
        receiptId: id,
        provider: receipt.provider,
        dryRun: false,
        confirmed: true,
        actorSub: auditActor.actorId,
        actorEmail: delegation.jwtUser.email ?? delegation.jwtUser.username ?? null,
        outcome: "success",
        detail: {
          verification,
          payloadHash: payloadHashNew,
          square: {
            nonPaymentEnvelope: result.nonPaymentEnvelope,
            reconcileRan: result.reconcileRan,
            orphanEmitted: result.orphanEmitted,
            commerceOrderId: result.commerceOrderId,
            paymentRecordId: result.paymentRecordId,
            refundCaseReconcileSuppressed: true,
          },
        },
      });
      await recordGovernanceAuditEntry({
        actionType: "OPERATIONS_WEBHOOK_RECEIPT_REPLAY",
        actorId: auditActor.actorId,
        actorName: auditActor.actorName,
        actorRole: "super_admin",
        targetType: "webhook_delivery_receipt",
        targetId: id,
        description: "Operational Square webhook replay executed (payment reconcile only)",
        metadata: { receiptId: id, provider: receipt.provider, forceReconcile, square: result },
      });
      return NextResponse.json({ ok: true, receiptId: id, provider: receipt.provider, result });
    }

    const result = await executeOperationalShippoWebhookReplay({
      receiptId: id,
      body: parsed,
      newPayloadHash: payloadHashNew,
      verification,
    });
    await recordOperationalWebhookReplayAudit({
      receiptId: id,
      provider: receipt.provider,
      dryRun: false,
      confirmed: true,
      actorSub: auditActor.actorId,
      actorEmail: delegation.jwtUser.email ?? delegation.jwtUser.username ?? null,
      outcome: "success",
      detail: {
        verification,
        payloadHash: payloadHashNew,
        shippo: {
          ignored: result.ignored,
          orphanEmitted: result.orphanEmitted,
          commerceOrderId: result.commerceOrderId ?? null,
          eventOutcome: result.eventOutcome ?? null,
        },
      },
    });
    await recordGovernanceAuditEntry({
      actionType: "OPERATIONS_WEBHOOK_RECEIPT_REPLAY",
      actorId: auditActor.actorId,
      actorName: auditActor.actorName,
      actorRole: "super_admin",
      targetType: "webhook_delivery_receipt",
      targetId: id,
      description: "Operational Shippo webhook replay executed",
      metadata: { receiptId: id, provider: receipt.provider, forceReconcile, shippo: result },
    });
    return NextResponse.json({ ok: true, receiptId: id, provider: receipt.provider, result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    await recordOperationalWebhookReplayAudit({
      receiptId: id,
      provider: receipt.provider,
      dryRun: false,
      confirmed: true,
      actorSub: auditActor.actorId,
      actorEmail: delegation.jwtUser.email ?? delegation.jwtUser.username ?? null,
      outcome: "error",
      detail: { verification, payloadHash: payloadHashNew, error: message },
    });
    await recordGovernanceAuditEntry({
      actionType: "OPERATIONS_WEBHOOK_RECEIPT_REPLAY",
      actorId: auditActor.actorId,
      actorName: auditActor.actorName,
      actorRole: "super_admin",
      targetType: "webhook_delivery_receipt",
      targetId: id,
      description: "Operational webhook replay failed during reconcile",
      metadata: { receiptId: id, provider: receipt.provider, error: message },
    });
    console.error("[webhook-replay POST]", e);
    return jsonError(500, "REPLAY_FAILED", "Reconcile threw — receipt marked failed; see governance + replay audit rows.");
  }
}
