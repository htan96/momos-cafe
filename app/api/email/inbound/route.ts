import { NextResponse } from "next/server";
import { verifyResendInbound } from "@/lib/email/verifyResendWebhook";
import { persistInboundEmailEvent } from "@/lib/email/inboundProcessor";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { OperationalActivitySeverity } from "@prisma/client";

export const runtime = "nodejs";

/** Resend inbound route — authenticated via Svix signatures (not internal Bearer secret) */
export async function POST(req: Request) {
  const raw = await req.text();
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
    return NextResponse.json({ error: "invalid_signature", detail: msg }, { status: 401 });
  }

  try {
    const result = await persistInboundEmailEvent(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[email/inbound POST]", e);
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
      },
      source: { handler: "POST app/api/email/inbound" },
      sourceTag: "api.email.inbound",
    });
    return NextResponse.json({ error: "inbound_persist_failed" }, { status: 500 });
  }
}
