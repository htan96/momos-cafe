import { NextResponse } from "next/server";
import { verifyResendInbound } from "@/lib/email/verifyResendWebhook";
import { persistInboundEmailEvent } from "@/lib/email/inboundProcessor";

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
      return NextResponse.json({ error: "inbound_unconfigured" }, { status: 503 });
    }
    return NextResponse.json({ error: "invalid_signature", detail: msg }, { status: 401 });
  }

  try {
    const result = await persistInboundEmailEvent(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[email/inbound POST]", e);
    return NextResponse.json({ error: "inbound_persist_failed" }, { status: 500 });
  }
}
