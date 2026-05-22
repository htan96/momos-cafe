import { NextResponse } from "next/server";
import { OperationalActivitySeverity, WebhookProcessingStatus } from "@prisma/client";
import { verifyResendInbound } from "@/lib/email/verifyResendWebhook";
import { persistInboundEmailEvent } from "@/lib/email/inboundProcessor";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { sha256HexUtf8 } from "@/lib/webhooks/payloadHash";
import { patchWebhookDeliveryReceipt, upsertWebhookDeliveryReceipt } from "@/lib/webhooks/recordWebhookDeliveryReceipt";

export const runtime = "nodejs";

function inferResendDedupe(payload: Record<string, unknown>): string | undefined {
  const data = (payload.data ?? payload) as Record<string, unknown>;
  const fromData =
    (typeof data.email_id === "string" && data.email_id) ||
    (typeof data.id === "string" && data.id) ||
    undefined;
  return typeof fromData === "string" ? fromData : undefined;
}

function looseParseEventType(raw: string): string | undefined {
  try {
    const o = JSON.parse(raw) as { type?: string };
    return typeof o.type === "string" ? o.type : undefined;
  } catch {
    return undefined;
  }
}

/** Resend inbound route — authenticated via Svix signatures (not internal Bearer secret) */
export async function POST(req: Request) {
  const raw = await req.text();
  const payloadHash = sha256HexUtf8(raw);

  let payload: Record<string, unknown>;
  try {
    payload = verifyResendInbound(raw, req.headers);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "verify_failed";
    if (msg === "MISSING_RESEND_WEBHOOK_SECRET") {
      console.error("[email/inbound] RESEND_WEBHOOK_SECRET missing");
      void emitPlatformEvent({
        subtype: PLATFORM_EVENT_SUBTYPE.SYSTEM_EMAIL_INBOUND_FAILED,
        category: "SYSTEM_EVENT",
        lifecycle: "failed",
        severity: OperationalActivitySeverity.error,
        actorType: "service",
        message: "Inbound email webhook aborted — verifier secret missing",
        detail: { stage: "verify", code: msg, httpStatus: 503 },
        source: { handler: "POST app/api/email/inbound" },
        sourceTag: "api.email.inbound",
      });
      return NextResponse.json({ error: "inbound_unconfigured" }, { status: 503 });
    }
    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.SYSTEM_EMAIL_INBOUND_FAILED,
      category: "SYSTEM_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.warning,
      actorType: "service",
      message: "Inbound email verifier rejected Svix-signed payload",
      detail: { stage: "verify", code: msg, httpStatus: 401 },
      source: { handler: "POST app/api/email/inbound" },
      sourceTag: "api.email.inbound",
    });
    try {
      await upsertWebhookDeliveryReceipt({
        provider: "resend",
        eventType: looseParseEventType(raw),
        payloadHash,
        signatureValid: false,
        processingStatus: WebhookProcessingStatus.failed,
        httpStatus: 401,
        errorCode: msg,
      });
    } catch {
      /* best-effort */
    }
    return NextResponse.json({ error: "invalid_signature", detail: msg }, { status: 401 });
  }

  const evtType = typeof payload.type === "string" ? payload.type : undefined;
  let receiptId: string | null = null;
  try {
    const dedupeExt = inferResendDedupe(payload);
    ({ id: receiptId } = await upsertWebhookDeliveryReceipt({
      provider: "resend",
      externalEventId: dedupeExt,
      eventType: evtType,
      payloadHash,
      signatureValid: true,
      processingStatus: WebhookProcessingStatus.accepted,
      httpStatus: 200,
    }));
  } catch {
    receiptId = null;
  }

  try {
    const result = await persistInboundEmailEvent(payload);
    if (receiptId) {
      try {
        await patchWebhookDeliveryReceipt(receiptId, {
          processingStatus: WebhookProcessingStatus.processed,
          httpStatus: 200,
          errorCode: null,
        });
      } catch {
        /* non-fatal */
      }
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[email/inbound POST]", e);
    if (receiptId) {
      try {
        await patchWebhookDeliveryReceipt(receiptId, {
          processingStatus: WebhookProcessingStatus.failed,
          httpStatus: 500,
          errorCode: "PERSIST_THROW",
        });
      } catch {
        /* best-effort */
      }
    }
    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.SYSTEM_EMAIL_INBOUND_FAILED,
      category: "SYSTEM_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.error,
      actorType: "service",
      message: "Inbound email persistence threw after verifier accepted payload",
      detail: {
        stage: "persist",
        httpStatus: 500,
        errorName: e instanceof Error ? e.name : typeof e,
        ...(receiptId ? { receiptId } : {}),
      },
      source: { handler: "POST app/api/email/inbound" },
      sourceTag: "api.email.inbound",
    });
    return NextResponse.json({ error: "inbound_persist_failed" }, { status: 500 });
  }
}
