import { NextResponse } from "next/server";
import { sendTransactionalOutbound } from "@/lib/email/sendTransactionalOutbound";
import { diagnoseSesReadinessForLogs, resolveSesOutboundConfig } from "@/lib/email/outboundTransportEnv";
import { verifyInternalSecretFromRequest } from "@/lib/server/internalAuth";

/**
 * SES-only staging smoke — minimal HTML proving end-to-end `SendTransactionalOutbound` SES path.
 *
 * Guards: bearer / `INTERNAL_SECRET_HEADER`, same as other internal routes.
 *
 * Prerequisites: SES env readiness (`SES_FROM_EMAIL`, AWS region + credential chain heuristic) plus
 * `SES_SMOKE_THREAD_ID` pointing at a real `EmailThread` row.
 */
export async function POST(req: Request) {
  if (!verifyInternalSecretFromRequest(req)) {
    return NextResponse.json({ error: "unauthorized", code: "INTERNAL_AUTH_REQUIRED" }, { status: 401 });
  }

  const sesCfg = resolveSesOutboundConfig();
  const threadIdEnv = process.env.SES_SMOKE_THREAD_ID?.trim();

  if (!sesCfg.ok || !threadIdEnv?.length) {
    const diag = diagnoseSesReadinessForLogs();
    return NextResponse.json(
      {
        ok: false,
        code: "SES_SMOKE_DISABLED",
        message:
          "Smoke send requires SES readiness (`SES_FROM_EMAIL`, AWS region + credentials heuristic) and SES_SMOKE_THREAD_ID (UUID EmailThread)",
        readiness: sesCfg,
        diag,
      },
      { status: 503 }
    );
  }

  let body: { to?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON", message: "Expected JSON body" }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!to) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_ERROR", message: 'JSON `{ "to": "recipient@domain" }`' },
      { status: 400 }
    );
  }

  const result = await sendTransactionalOutbound({
    to: [to],
    subject: "[Momos SES smoke] Operational check",
    html: "<html><body><p>SES smoke OK</p></body></html>",
    threadId: threadIdEnv,
    suppressPlatformEvents: true,
  });

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      transport: result.transport,
      threadId: result.threadId,
      messageId: result.outboundMessageId,
      providerMessageId: result.providerMessageId,
    });
  }

  const status = typeof result.httpStatus === "number" ? result.httpStatus : 502;
  return NextResponse.json(
    { ok: false, code: result.platformCode, message: result.customerMessage ?? result.platformCode },
    { status }
  );
}
