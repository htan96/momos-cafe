import { NextResponse } from "next/server";
import { OperationalActivitySeverity } from "@prisma/client";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { sha256HexUtf8 } from "@/lib/webhooks/payloadHash";
import { verifyInternalSecretFromRequest } from "@/lib/server/internalAuth";

/**
 * Placeholder for SES → SNS bounce/complaint/delivery payloads.
 *
 * **TODO SNS cert verification**: validate SNS `SigningCertURL` host allow-list + PEM signature over canonical string (`Message`/`MessageId`/…)
 * prior to interpreting delivery notifications (bounce / complaint ingestion).
 *
 * Today: deterministic hash fingerprint only — callers should authenticate with INTERNAL_API_SECRET to avoid arbitrary noise.
 */
export async function POST(req: Request) {
  if (!verifyInternalSecretFromRequest(req)) {
    return NextResponse.json({ error: "unauthorized", code: "INTERNAL_AUTH_REQUIRED" }, { status: 401 });
  }

  const rawBody = await req.text();
  const digest = sha256HexUtf8(rawBody);

const parseHint = (() => {
    const hints: Record<string, unknown> = { parseAttempted: true };
    try {
      const parsedUnknown: unknown = JSON.parse(rawBody) as unknown;
      if (!parsedUnknown || typeof parsedUnknown !== "object" || Array.isArray(parsedUnknown)) {
        hints.shape = "non-object";
      } else {
        hints.keyCountApprox = Object.keys(parsedUnknown).length;
      }
    } catch {
      hints.shape = "non-json-body";
    }
    return hints;
  })();


  void emitPlatformEvent({
    subtype: PLATFORM_EVENT_SUBTYPE.SYSTEM_EMAIL_BOUNCE_STUB_RECEIVED,
    category: "SYSTEM_EVENT",
    lifecycle: "processing",
    severity: OperationalActivitySeverity.info,
    actorType: "service",
    message: "SES notification webhook stub receipt (signature verification deferred)",
    detail: {
      payload_hash_sha256_hex: digest,
      ...parseHint,
    },
    sourceTag: "webhooks.internal.ses_notification_stub",
    skipIncidentEvaluation: true,
  });

  return NextResponse.json({ ok: true, received: true, payload_hash_sha256_hex: digest });
}
