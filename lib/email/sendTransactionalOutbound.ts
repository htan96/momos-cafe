import type { EmailMessage, Prisma } from "@prisma/client";
import { OperationalActivitySeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const HANDLER_LABEL = "POST app/api/email/send";
import { appendNotificationEvent } from "@/lib/notifications/notificationEvents";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import { resolveSesOutboundConfig } from "@/lib/email/outboundTransportEnv";
import { sendEmailViaSes } from "@/lib/email/transports/sendEmailViaSes";
import {
  ensureSesThreadReplyRouting,
  pickOperationalReplyToMailbox,
} from "@/lib/email/sesOperationalOutboundThreading";

function isPrismaUniqueConstraintError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
}
type EmailHydrateRow = EmailMessage & {
  thread: { commerceOrderId: string | null } | null;
};

/** Historical rows may persist `provider: \"resend\"`; new sends are SES-only. */
function readTransport(rawPayload: unknown): "ses" | "resend" | null {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return null;
  const p = rawPayload as Record<string, unknown>;
  return p.provider === "ses" || p.provider === "resend" ? p.provider : null;
}

/** Duplicate `EmailMessage.idempotencyKey` replay — skips provider round trips. */
function resolveOutboundFromStoredEmailRow(row: EmailHydrateRow, commerceOrderFallback: string | null) {
  const tid = row.threadId;
  const commerceOrderId = commerceOrderFallback ?? row.thread?.commerceOrderId ?? null;
  const transported = readTransport(row.rawPayload ?? null);

  if (row.deliveryStatus === "queued") {
    return {
      ok: false as const,
      httpStatus: 409,
      platformCode: "EMAIL_IDEMPOTENCY_PENDING",
      retrySuggested: false,
      customerMessage:
        "This idempotency key still has an in-flight outbound email row — wait for QUEUED completion",
      outboundMessageId: row.id,
      commerceOrderId,
      threadId: tid,
      transport: transported ?? undefined,
    };
  }

  if (row.deliveryStatus === "sent") {
    const t = transported ?? ("ses" as const);
    return {
      ok: true as const,
      threadId: tid,
      outboundMessageId: row.id,
      providerMessageId: row.providerMessageId,
      transport: t,
    };
  }

  const raw = row.rawPayload;
  let codeStr = row.deliveryStatus === "failed" ? "SES_TRANSPORT_FAILED" : "EMAIL_SEND_FAILED";
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const rp = raw as Record<string, unknown>;
    const c =
      rp.code ??
      rp.platformCode ??
      (rp.resendError &&
      typeof rp.resendError === "object" &&
      !Array.isArray(rp.resendError) &&
      typeof (rp.resendError as { name?: string }).name === "string"
        ? (rp.resendError as { name: string }).name
        : undefined);
    if (typeof c === "string") codeStr = c;
  }

  const retry =
    typeof codeStr === "string" &&
    typeof raw === "object" &&
    raw &&
    !Array.isArray(raw) &&
    (((raw as Record<string, unknown>).retryable as boolean | undefined) === true ||
      codeStr.includes("429") ||
      codeStr === "Throttling");

  return {
    ok: false as const,
    httpStatus: retry ? 429 : 502,
    platformCode:
      typeof codeStr === "string" ? codeStr.toUpperCase().replace(/\s+/g, "_").slice(0, 96) : "EMAIL_SEND_FAILED",
    retrySuggested: Boolean(retry),
    customerMessage: "Prior send attempt persisted for this idempotency key failed",
    outboundMessageId: row.id,
    commerceOrderId,
    threadId: tid,
    transport: transported ?? undefined,
  };
}

function sesTelemetryReasonFromFailure(send: {
  ok: false;
  code: string;
  sdkName?: string;
  message?: string;
}): string | undefined {
  if (send.code === "Throttling") return "ses_throttle";
  const sdkName = typeof send.sdkName === "string" ? send.sdkName : "";
  const msg = typeof send.message === "string" ? send.message : "";
  if (
    send.code === "AccessDenied" ||
    sdkName.includes("InvalidClientTokenId") ||
    /invalid.*credential|invalid.*security token/i.test(msg)
  )
    return "ses_invalid_credentials_detected_heuristic";
  return undefined;
}

export type SendTransactionalOutboundInput = {
  to: string[];
  subject: string;
  text?: string | null;
  html?: string | null;
  threadId?: string | null;
  commerceOrderId?: string | null;
  replyTo?: string | null;
  correlationId?: string;
  idempotencyKey?: string;
  /** Prefer true for programmatic callers — suppresses deterministic validation failure emissions duplicating callers. */
  suppressPlatformEvents?: boolean;
};

export type TransactionalOutboundSuccess = {
  ok: true;
  threadId: string;
  outboundMessageId: string;
  providerMessageId: string | null;
  transport: "ses" | "resend";
};

export type TransactionalOutboundFailure = {
  ok: false;
  httpStatus: number;
  platformCode: string;
  retrySuggested?: boolean;
  customerMessage?: string;
  /** HTTP / ops detail (`EMAIL_UNCONFIGURED` SES readiness reason codes, etc.). */
  detail?: string;
  /** When `suppressPlatformEvents`, orchestration skips dual emissions. */
  suppressPlatformEvents?: boolean;
  /** Persisted outbound row — present when enqueue succeeded but provider failed */
  outboundMessageId?: string;
  commerceOrderId?: string | null;
  threadId?: string | null;
  transport?: "ses" | "resend";
};

export type SendTransactionalOutboundResult = TransactionalOutboundSuccess | TransactionalOutboundFailure;

async function persistFailurePayload(id: string, payload: Prisma.InputJsonValue): Promise<void> {
  await prisma.emailMessage.update({
    where: { id },
    data: { deliveryStatus: "failed", rawPayload: payload },
  });
}

async function persistSuccessPayload(
  id: string,
  patch: {
    providerMessageId: string | null;
    rawPayload: Prisma.InputJsonValue;
  }
): Promise<void> {
  await prisma.emailMessage.update({
    where: { id },
    data: {
      providerMessageId: patch.providerMessageId,
      deliveryStatus: "sent",
      rawPayload: patch.rawPayload,
    },
  });
}

export async function sendTransactionalOutbound(
  input: SendTransactionalOutboundInput
): Promise<SendTransactionalOutboundResult> {
  const subject = input.subject.trim();
  const text = input.text?.trim() ?? "";
  const html = input.html?.trim() ?? "";
  const commerceOrderId = input.commerceOrderId?.trim() || null;

  if (!subject || (!text && !html) || input.to.length === 0) {
    return {
      ok: false,
      httpStatus: 400,
      platformCode: "VALIDATION_ERROR",
      retrySuggested: false,
      customerMessage: "to, subject, and text or html required",
      suppressPlatformEvents: input.suppressPlatformEvents,
    };
  }

  let threadId = input.threadId?.trim() || null;
  try {
    if (!threadId && commerceOrderId) {
      const t = await prisma.emailThread.findFirst({
        where: { commerceOrderId },
        orderBy: { updatedAt: "desc" },
      });
      threadId = t?.id ?? null;
    }

    if (!threadId) {
      return {
        ok: false,
        httpStatus: 400,
        platformCode: "THREAD_CONTEXT_REQUIRED",
        retrySuggested: false,
        customerMessage: "Provide threadId or commerceOrderId so outbound mail stays threaded",
        suppressPlatformEvents: input.suppressPlatformEvents,
        commerceOrderId,
      };
    }

    const idempotencyKeyTrimmed = input.idempotencyKey?.trim() ?? "";
    if (idempotencyKeyTrimmed.length > 0) {
      const rowHit = await prisma.emailMessage.findUnique({
        where: { idempotencyKey: idempotencyKeyTrimmed },
        include: { thread: { select: { commerceOrderId: true } } },
      });
      if (rowHit) {
        const replay = resolveOutboundFromStoredEmailRow(rowHit as EmailHydrateRow, commerceOrderId);
        if (!replay.ok) return { ...replay, suppressPlatformEvents: input.suppressPlatformEvents };
        return replay;
      }
    }

    const sesCfg = resolveSesOutboundConfig();
    if (!sesCfg.ok) {
      const heuristicReason =
        sesCfg.reason === "credential_env_asymmetric_hint"
          ? "ses_invalid_credentials_detected_heuristic"
          : sesCfg.reason;
      console.warn(
        JSON.stringify({
          ts: new Date().toISOString(),
          event: "outbound_email_resolve",
          outcome: "unconfigured",
          ses_blocking_heuristic: heuristicReason,
          transport: "ses_only",
        })
      );

      if (!input.suppressPlatformEvents) {
        void emitPlatformEvent({
          subtype: PLATFORM_EVENT_SUBTYPE.SYSTEM_EMAIL_SEND_FAILED,
          category: "SYSTEM_EVENT",
          lifecycle: "failed",
          severity: OperationalActivitySeverity.error,
          actorType: "service",
          message:
            "Outbound email aborted — Amazon SES prerequisites are incomplete for transactional send",
          detail: {
            stage: "config",
            httpStatus: 503,
            code: "EMAIL_UNCONFIGURED",
            sesReadinessReason: sesCfg.reason,
            reason: heuristicReason,
          },
          source: { handler: HANDLER_LABEL },
          sourceTag: "api.email.send",
        });
      }
      return {
        ok: false,
        httpStatus: 503,
        platformCode: "EMAIL_UNCONFIGURED",
        retrySuggested: false,
        customerMessage:
          "Transactional outbound email is not configured — set SES + AWS credential environment for this deployment",
        detail: sesCfg.reason,
        commerceOrderId,
        threadId,
        suppressPlatformEvents: input.suppressPlatformEvents,
      };
    }

    const fromSes = process.env.SES_FROM_EMAIL!.trim();

    const sesThreading = await ensureSesThreadReplyRouting(threadId);
    const replyMailbox = pickOperationalReplyToMailbox({
      explicitOutbound: input.replyTo ?? null,
      sesComputedMailbox: sesThreading?.replyToMailbox ?? null,
    });

    let outbound: EmailMessage;

    try {
      outbound = await prisma.emailMessage.create({
        data: {
          threadId,
          direction: "outbound",
          fromEmail: fromSes,
          toEmails: input.to as unknown as Prisma.InputJsonValue,
          subject,
          textBody: text || null,
          htmlBody: html || null,
          deliveryStatus: "queued",
          rfcMessageId: sesThreading?.rfcMessageIdStored ?? undefined,
          ...(idempotencyKeyTrimmed.length > 0 ? { idempotencyKey: idempotencyKeyTrimmed } : {}),
        },
      });
    } catch (e: unknown) {
      if (idempotencyKeyTrimmed && isPrismaUniqueConstraintError(e)) {
        const rowHit = await prisma.emailMessage.findUnique({
          where: { idempotencyKey: idempotencyKeyTrimmed },
          include: { thread: { select: { commerceOrderId: true } } },
        });
        if (rowHit) {
          const replay = resolveOutboundFromStoredEmailRow(rowHit as EmailHydrateRow, commerceOrderId);
          if (!replay.ok) return { ...replay, suppressPlatformEvents: input.suppressPlatformEvents };
          return replay;
        }
      }
      throw e;
    }

    const send = await sendEmailViaSes({
      from: fromSes,
      to: input.to,
      subject,
      text: text || undefined,
      html: html || undefined,
      replyTo: replyMailbox,
      outboundRfcMessageIdHeader: sesThreading?.messageIdHeaderValue,
      correlationId: input.correlationId,
      idempotencyKey: idempotencyKeyTrimmed || input.idempotencyKey,
    });

    const baseCorrelation = {
      correlationId: input.correlationId ?? null,
      idempotencyKey:
        idempotencyKeyTrimmed.length > 0 ? idempotencyKeyTrimmed : input.idempotencyKey?.trim() || null,
    };

    if (!send.ok) {
      await persistFailurePayload(outbound.id, {
        ...baseCorrelation,
        provider: "ses",
        stage: "ses_transport",
        code: send.code,
        sdkName: send.sdkName ?? null,
        message: typeof send.message === "string" ? send.message.slice(0, 500) : null,
        retryable: typeof send.retryable === "boolean" ? send.retryable : undefined,
      });

      if (!input.suppressPlatformEvents) {
        void emitPlatformEvent({
          subtype: PLATFORM_EVENT_SUBTYPE.SYSTEM_EMAIL_SEND_FAILED,
          category: "SYSTEM_EVENT",
          lifecycle: "failed",
          severity: OperationalActivitySeverity.warning,
          actorType: "service",
          message: "SES rejected outbound staff email payload",
          entities: commerceOrderId ? { commerceOrderId } : {},
          detail: {
            stage: "ses_transport",
            code: send.code,
            sdkName: send.sdkName,
            retryable: send.retryable,
            reason: sesTelemetryReasonFromFailure(send),
            providerMessage:
              typeof send.message === "string" ? send.message.slice(0, 400) : undefined,
          },
          legacyFlatMetadata: { threadId },
          source: { handler: HANDLER_LABEL },
          sourceTag: "api.email.send",
        });
      }
      const throttle = send.code === "Throttling";
      return {
        ok: false,
        httpStatus: throttle ? 429 : 502,
        platformCode: send.code.toUpperCase().replace(/\s+/g, "_"),
        retrySuggested: Boolean(send.retryable),
        customerMessage: send.message ?? "SES rejected send",
        outboundMessageId: outbound.id,
        commerceOrderId,
        threadId,
        transport: "ses",
        suppressPlatformEvents: input.suppressPlatformEvents,
      };
    }

    await persistSuccessPayload(outbound.id, {
      providerMessageId: send.messageId,
      rawPayload: {
        ...baseCorrelation,
        provider: "ses",
        outbound: true,
        providerMessageId: send.messageId,
        ses: send.responseSnippet,
        rfcOutboundMessageId: sesThreading?.rfcMessageIdStored ?? null,
        replyToOperational: replyMailbox ?? null,
      } as Prisma.InputJsonValue,
    });

    await appendNotificationEvent(
      "email.outbound.sent",
      {
        threadId,
        messageId: outbound.id,
        transport: "ses",
        providerMessageId: send.messageId,
        sesMessageId: send.messageId,
        to: input.to,
      } as Prisma.InputJsonValue
    );

    return {
      ok: true,
      threadId,
      outboundMessageId: outbound.id,
      providerMessageId: send.messageId,
      transport: "ses",
    };
  } catch (e) {
    console.error("[sendTransactionalOutbound]", e);
    if (!input.suppressPlatformEvents) {
      void emitPlatformEvent({
        subtype: PLATFORM_EVENT_SUBTYPE.SYSTEM_EMAIL_SEND_FAILED,
        category: "SYSTEM_EVENT",
        lifecycle: "failed",
        severity: OperationalActivitySeverity.error,
        actorType: "service",
        message: "Unhandled error while orchestrating transactional email send",
        detail: {
          stage: "handler",
          httpStatus: 500,
          errorName: e instanceof Error ? e.name : typeof e,
        },
        source: { handler: HANDLER_LABEL },
        sourceTag: "api.email.send",
      });
    }
    return {
      ok: false,
      httpStatus: 500,
      platformCode: "EMAIL_SEND_FAILED",
      retrySuggested: true,
      customerMessage: "Could not send email",
      commerceOrderId,
      threadId: threadId ?? null,
      suppressPlatformEvents: input.suppressPlatformEvents,
    };
  }
}
