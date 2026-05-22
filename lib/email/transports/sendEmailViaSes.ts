import {
  GetAccountCommand,
  SESv2Client,
  type SendEmailCommandInput,
  SendEmailCommand,
} from "@aws-sdk/client-sesv2";
import { resolveAwsRegion } from "@/lib/aws/awsRuntimeEnv";

export type SendEmailViaSesInput = {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  /** Custom Message-ID carried as a Simple-message header (RFC 5322 threading). Include angle brackets if desired — normalized internally. */
  outboundRfcMessageIdHeader?: string;
  correlationId?: string;
  idempotencyKey?: string;
};

export type SendEmailViaSesSuccess = {
  ok: true;
  messageId: string;
  provider: "ses";
  /** Lightweight echo for persistence / ops (omit large bodies). */
  responseSnippet: Record<string, unknown>;
};

export type SendEmailViaSesFailure = {
  ok: false;
  provider: "ses";
  code:
    | "Throttling"
    | "MessageRejected"
    | "MailFromDomainNotVerified"
    | "SendingPaused"
    | "AccountSuspended"
    | "AccessDenied"
    | "InvalidParameter"
    | "ConfigurationError"
    | "Unknown";
  sdkName?: string;
  message?: string;
  retryable?: boolean;
};

export type SendEmailViaSesResult = SendEmailViaSesSuccess | SendEmailViaSesFailure;

const TAG_NAME_RE = /^[A-Za-z0-9_-]{1,255}$/;
const TAG_VALUE_RE = /^[A-Za-z0-9_-]{1,256}$/;
const MAX_TAGS = 4;

function safeTagComponents(name: string, value?: string): { Name: string; Value: string } | null {
  if (!value?.trim()) return null;
  const v256 = value.trim().slice(0, 256);
  const n = name.trim().slice(0, 255);
  const safeName = /^[a-zA-Z]+$/.test(n) ? n : "custom";
  if (!TAG_VALUE_RE.test(v256)) return null;
  if (!TAG_NAME_RE.test(safeName)) return null;
  return { Name: safeName, Value: v256 };
}

function mapSesError(err: unknown): Omit<SendEmailViaSesFailure, "ok" | "provider"> {
  if (!err || typeof err !== "object") {
    return { code: "Unknown", retryable: true, message: String(err) };
  }
  const e = err as { name?: string; message?: string; $fault?: string; $retryable?: { throttling?: boolean } };
  const name = typeof e.name === "string" ? e.name : "Unknown";

  const msg = typeof e.message === "string" ? e.message.slice(0, 500) : undefined;
  switch (name) {
    case "TooManyRequestsException":
    case "Throttling":
    case "ThrottlingException":
    case "RequestThrottled":
    case "ServiceQuotaExceededException":
      return {
        sdkName: name,
        message: msg,
        code: "Throttling",
        retryable: true,
      };
    case "MailFromDomainNotVerifiedException":
    case "SendingPausedException":
      return {
        sdkName: name,
        message: msg,
        code: name.includes("SendingPaused") ? "SendingPaused" : "MailFromDomainNotVerified",
        retryable: false,
      };
    case "AccountSuspendedException":
      return { sdkName: name, message: msg, code: "AccountSuspended", retryable: false };
    case "MessageRejected":
    case "MessageRejectedException":
    case "RejectedMessageContents":
      return {
        sdkName: name,
        message: msg,
        code: "MessageRejected",
        retryable: false,
      };
    case "AccessDeniedException":
    case "ForbiddenException":
    case "NotAuthorized":
    case "InvalidClientTokenId":
      return {
        sdkName: name,
        message: msg,
        code: "AccessDenied",
        retryable: false,
      };
    case "BadRequestException":
      return {
        sdkName: name,
        message: msg,
        code: "InvalidParameter",
        retryable: false,
      };
    case "IncompleteSignature":
      return {
        sdkName: name,
        message: msg,
        code: "ConfigurationError",
        retryable: false,
      };
    default:
      return {
        sdkName: name,
        message: msg,
        code: "Unknown",
        retryable: Boolean((e as { $retryable?: boolean }).$retryable),
      };
  }
}

function buildSesClient(): SESv2Client | null {
  const region = resolveAwsRegion();
  if (!region) return null;
  return new SESv2Client({ region });
}

/**
 * SESv2 transactional send — prefers simple body payloads.
 */
export async function sendEmailViaSes(input: SendEmailViaSesInput): Promise<SendEmailViaSesResult> {
  const client = buildSesClient();
  if (!client) {
    return {
      ok: false,
      provider: "ses",
      code: "ConfigurationError",
      message: "AWS_REGION or AWS_DEFAULT_REGION is not set",
      sdkName: "MissingRegion",
      retryable: false,
    };
  }
  const cfgSet = process.env.SES_CONFIGURATION_SET_NAME?.trim();
  const tags: NonNullable<SendEmailCommandInput["EmailTags"]> = [];
  const idempotencyTag = safeTagComponents("idempotency", input.idempotencyKey);
  if (idempotencyTag) tags.push(idempotencyTag);
  const correlationTag = safeTagComponents("correlation", input.correlationId);
  if (correlationTag) tags.push(correlationTag);
  const clipped = tags.slice(0, MAX_TAGS);

  const text = input.text?.trim();
  const html = input.html?.trim();
  if (!html && !text) {
    return {
      ok: false,
      provider: "ses",
      code: "InvalidParameter",
      message: "text or html required",
      sdkName: "ValidationError",
      retryable: false,
    };
  }

  const mimeMessageIdRaw = input.outboundRfcMessageIdHeader?.trim();
  let mimeMessageIdHeader: string | undefined;
  if (mimeMessageIdRaw) {
    const stripped = mimeMessageIdRaw.replace(/^<\s*/, "").replace(/\s*>$/u, "").trim();
    if (stripped.includes("@")) {
      mimeMessageIdHeader = `<${stripped}>`;
    }
  }

  const bodyFragment: SendEmailCommandInput["Content"] = {};
  bodyFragment.Simple = {
    Subject: { Data: input.subject, Charset: "UTF-8" },
    Body: {
      ...(html ? { Html: { Data: html, Charset: "UTF-8" } } : {}),
      ...(text ? { Text: { Data: text, Charset: "UTF-8" } } : {}),
    },
    ...(mimeMessageIdHeader
      ? {
          Headers: [{ Name: "Message-ID", Value: mimeMessageIdHeader }],
        }
      : {}),
  };

  const cmdInput: SendEmailCommandInput = {
    FromEmailAddress: input.from,
    Destination: { ToAddresses: input.to },
    Content: bodyFragment,
    EmailTags: clipped.length ? clipped : undefined,
    ConfigurationSetName: cfgSet || undefined,
    ReplyToAddresses: input.replyTo?.trim()
      ? [input.replyTo.trim()]
      : undefined,
  };

  try {
    const out = await client.send(new SendEmailCommand(cmdInput));
    const mid = out.MessageId;
    if (!mid) {
      return {
        ok: false,
        provider: "ses",
        code: "Unknown",
        message: "SendEmail returned empty MessageId",
        sdkName: "InvalidResponse",
        retryable: true,
      };
    }
    return {
      ok: true,
      messageId: mid,
      provider: "ses",
      responseSnippet: { MessageId: mid, ...(out.$metadata.requestId ? { RequestId: out.$metadata.requestId } : {}) },
    };
  } catch (err: unknown) {
    const mapped = mapSesError(err);
    return { ok: false, provider: "ses", ...mapped };
  }
}

/**
 * Lightweight read for ops health checks — verifies credentials + SES account API access.
 */
export async function sesAccountProbe(): Promise<
  | { ok: true; maxSendRate?: number | null }
  | (SendEmailViaSesFailure & { ok: false })
> {
  const client = buildSesClient();
  if (!client) {
    return {
      ok: false,
      provider: "ses",
      code: "ConfigurationError",
      message: "AWS_REGION or AWS_DEFAULT_REGION is not set",
      sdkName: "MissingRegion",
      retryable: false,
    };
  }
  try {
    const out = await client.send(new GetAccountCommand({}));
    return {
      ok: true,
      maxSendRate: out.SendQuota?.MaxSendRate ?? null,
    };
  } catch (err: unknown) {
    const mapped = mapSesError(err);
    return { ok: false, provider: "ses", ...mapped };
  }
}
