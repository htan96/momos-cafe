import { NextResponse } from "next/server";
import { OperationalActivitySeverity } from "@prisma/client";
import type { AwsSnsHttpsBody } from "@/lib/email/sns/verifyAwsSnsHttpsNotification";
import {
  snsConfirmSubscriptionGet,
  verifyAwsSnsHttpsBody,
} from "@/lib/email/sns/verifyAwsSnsHttpsNotification";
import { parseSesReceiptFromInnerMessage } from "@/lib/email/parseSesReceiptFromSnsMessage";
import { resolveSesInboundOperationalDomain } from "@/lib/email/inboundOperationalEnv";
import { ingestOperationalInboundEmail } from "@/lib/email/ingestOperationalInboundEmail";
import { verifyInternalSecretFromRequest } from "@/lib/server/internalAuth";
import { emitOperationalEvent } from "@/lib/operations/emitOperationalEvent";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";

export const runtime = "nodejs";

function isSesSnsEnvelope(x: Record<string, unknown>): x is Record<string, unknown> &
  Omit<AwsSnsHttpsBody, "Type"> & { Type: string } {
  return typeof x.Type === "string" && typeof x.SigningCertURL === "string";
}

/** Shared forwarder envelope (Lambda/script) authenticated with Bearer `INTERNAL_API_SECRET`. */
export type SesOperationalForwardPayload = {
  from: string;
  to?: string | string[];
  subject?: string;
  text?: string | null;
  html?: string | null;
  /** Legacy RFC-ish identifier — prefer pairing with `sesMessageId`. */
  messageId?: string;
  sesMessageId?: string | null;
  rfcMessageId?: string | null;
  inReplyTo?: string | null;
  references?: string | null;
  receivedAt?: string;
  s3Bucket?: string | null;
  s3Key?: string | null;
};

function coerceStringArray(raw: SesOperationalForwardPayload["to"]): string[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((x) => String(x).trim()).filter(Boolean);
}

/** Public HTTPS endpoint for Amazon SNS (SES receive) + optional internal JSON forwarder. */
export async function POST(req: Request) {
  const raw = await req.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  /** SNS envelopes include `SigningCertURL` + `Signature`. Forwarder contract does not — gate with Bearer. */
  if (isSesSnsEnvelope(json)) {
    const expectedArn = process.env.SES_INBOUND_SNS_TOPIC_ARN?.trim();
    if (!expectedArn) {
      console.error("[email/inbound-ses] SES_INBOUND_SNS_TOPIC_ARN missing");
      await emitOperationalEvent({
        type: PLATFORM_EVENT_SUBTYPE.SYSTEM_EMAIL_INBOUND_FAILED,
        severity: OperationalActivitySeverity.warning,
        actorType: "service",
        message: "SES SNS inbound webhook blocked — SES_INBOUND_SNS_TOPIC_ARN missing",
        metadata: {},
      }).catch(() => {});
      return NextResponse.json({ error: "sns_inbound_unconfigured" }, { status: 503 });
    }

    try {
      await verifyAwsSnsHttpsBody(json as AwsSnsHttpsBody, raw, {
        expectedTopicArn: expectedArn,
        maxTimestampSkewMinutes: 60,
      });
    } catch (e) {
      const code = e instanceof Error ? e.message : "sns_verify_failed";
      void emitPlatformEvent({
        subtype: PLATFORM_EVENT_SUBTYPE.SECURITY_WEBHOOK_SIGNATURE_INVALID,
        category: "SECURITY_EVENT",
        lifecycle: "failed",
        severity: OperationalActivitySeverity.warning,
        actorType: "service",
        message: "SES inbound SNS verifier rejected HTTPS payload signature",
        detail: { handler: "POST /api/email/inbound-ses", code },
        source: { handler: "POST app/api/email/inbound-ses" },
        sourceTag: "api.email.inbound_ses",
      });
      return NextResponse.json({ error: "sns_signature_invalid", code }, { status: 401 });
    }

    const sns = json as AwsSnsHttpsBody;
    const t = sns.Type;

    if (t === "SubscriptionConfirmation" && sns.SubscribeURL) {
      const http = await snsConfirmSubscriptionGet(sns.SubscribeURL);
      return NextResponse.json({
        ok: true,
        stage: "subscription_confirmation",
        remoteStatus: http,
      });
    }

    if (t === "UnsubscribeConfirmation") {
      return NextResponse.json({ ok: true, stage: "unsubscribe_ack" });
    }

    if (t !== "Notification" || typeof sns.Message !== "string") {
      return NextResponse.json({ ok: true, ignored: true, reason: "non_notification" });
    }

    let inner: Record<string, unknown>;
    try {
      inner = JSON.parse(sns.Message) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "sns_message_not_json" }, { status: 400 });
    }

    const opDomain = resolveSesInboundOperationalDomain();
    const parsedBundle = parseSesReceiptFromInnerMessage({
      inner,
      operationalDomain: opDomain,
    });

    if (!parsedBundle) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "not_ses_received_notification",
      });
    }

    const { parsed } = parsedBundle;

    if (parsed.needsS3Content) {
      await emitOperationalEvent({
        type: PLATFORM_EVENT_SUBTYPE.SYSTEM_EMAIL_INBOUND_FAILED,
        severity: OperationalActivitySeverity.warning,
        actorType: "service",
        message: "SES inbound needs S3 object hydration (content not inlined in SNS) — unsupported in this build",
        metadata: {
          s3Bucket: parsed.s3Bucket,
          s3Key: parsed.s3Key,
          sesInternalMessageId: parsed.sesInternalMessageId,
        },
      }).catch(() => {});
      await emitPlatformEvent({
        subtype: PLATFORM_EVENT_SUBTYPE.SYSTEM_EMAIL_INBOUND_FAILED,
        category: "SYSTEM_EVENT",
        lifecycle: "failed",
        severity: OperationalActivitySeverity.warning,
        actorType: "service",
        message:
          "Operational inbound SES path requires SNS-inlined raw content — S3-object-only ingest not implemented yet",
        detail: {
          httpStatus: 501,
          code: "SES_INBOUND_REQUIRES_S3_HYDRATION",
          s3Bucket: parsed.s3Bucket,
          s3Key: parsed.s3Key,
        },
        source: { handler: "POST app/api/email/inbound-ses" },
        sourceTag: "api.email.inbound_ses",
      });
      return NextResponse.json(
        {
          error: "ses_inbound_requires_s3_hydration",
          detail: "Configure receipt rule to publish raw content in SNS or add S3 fetch (phase-2).",
        },
        { status: 501 }
      );
    }

    const envelope = {
      sesSns: true,
      snsMessageId: sns.MessageId,
      sesNotification: inner,
    } as Record<string, unknown>;

    const ing = await ingestOperationalInboundEmail({
      transport: "ses_sns",
      from: parsed.from,
      to: parsed.to,
      subject: parsed.subject,
      textBody: parsed.textBody,
      htmlBody: parsed.htmlBody,
      dedupeExternalId: parsed.sesInternalMessageId,
      rfcMessageId: parsed.rfcMessageId,
      inReplyTo: parsed.inReplyTo,
      referencesHeader: parsed.referencesHeader,
      rawEnvelope: envelope,
      headerFingerprint: parsed.headerFingerprint,
    });

    if (!ing.ok) {
      if (ing.code === "SKIPPED_MAILBOX_FILTER") {
        return NextResponse.json({ ok: true, skipped: true, reason: "recipient_not_ops_mailbox" });
      }
      if (ing.code === "RATE_LIMIT_SENDER_DAY") {
        return NextResponse.json({ error: "rate_limited", code: ing.code }, { status: 429 });
      }
      return NextResponse.json({ error: ing.code }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      threadId: ing.threadId,
      messageId: ing.messageId,
      linkedOrders: ing.linkedOrders,
      quarantine: ing.quarantine,
    });
  }

  /** Internal forwarder path */
  if (!verifyInternalSecretFromRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = json as unknown as SesOperationalForwardPayload;
  const from = typeof body.from === "string" ? body.from.trim() : "";
  const to = coerceStringArray(body.to);
  if (!from || to.length === 0) {
    return NextResponse.json({ error: "forwarder_validation", detail: "from and to required" }, { status: 400 });
  }

  if (body.s3Bucket && body.s3Key && !body.text && !body.html) {
    await emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.SYSTEM_EMAIL_INBOUND_FAILED,
      category: "SYSTEM_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.warning,
      actorType: "service",
      message: "SES forwarder referenced S3 object without inline bodies — not implemented",
      detail: { httpStatus: 501, code: "FORWARDER_S3_ONLY" },
      source: { handler: "POST app/api/email/inbound-ses" },
      sourceTag: "api.email.inbound_ses",
    });
    return NextResponse.json({ error: "forwarder_s3_only_unsupported" }, { status: 501 });
  }

  const sesMessageId = typeof body.sesMessageId === "string" ? body.sesMessageId.trim() : null;
  const rfcExplicit = typeof body.rfcMessageId === "string" ? body.rfcMessageId.trim() : null;
  const legacyMessageId = typeof body.messageId === "string" ? body.messageId.trim() : null;
  const rfcMerged = rfcExplicit ?? legacyMessageId;

  const ing = await ingestOperationalInboundEmail({
    transport: "ses_forwarder",
    from,
    to,
    subject: typeof body.subject === "string" ? body.subject : "",
    textBody: typeof body.text === "string" ? body.text : null,
    htmlBody: typeof body.html === "string" ? body.html : null,
    dedupeExternalId: sesMessageId ?? rfcMerged,
    rfcMessageId: rfcMerged,
    inReplyTo: body.inReplyTo ?? null,
    referencesHeader: body.references ?? null,
    rawEnvelope: { sesForwarder: true, receivedAt: body.receivedAt ?? null, ...body },
  });

  if (!ing.ok) {
    if (ing.code === "SKIPPED_MAILBOX_FILTER") {
      return NextResponse.json({ ok: true, skipped: true, reason: "recipient_not_ops_mailbox" });
    }
    if (ing.code === "RATE_LIMIT_SENDER_DAY") {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    return NextResponse.json({ error: ing.code }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    threadId: ing.threadId,
    messageId: ing.messageId,
    linkedOrders: ing.linkedOrders,
    quarantine: ing.quarantine,
  });
}
