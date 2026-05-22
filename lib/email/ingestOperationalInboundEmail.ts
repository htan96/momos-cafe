import type { Prisma } from "@prisma/client";
import { OperationalActivitySeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appendNotificationEvent } from "@/lib/notifications/notificationEvents";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import {
  hasOperationalSesRecipient,
  matchOperationalRecipient,
  resolveSesInboundOperationalDomain,
} from "@/lib/email/inboundOperationalEnv";
import { rateLimitHit } from "@/lib/server/rateLimitMemory";

function uniq(ids: string[]): string[] {
  return [...new Set(ids.map((x) => x.toLowerCase()))];
}

function extractOrderIds(blob: string): string[] {
  const r =
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
  return uniq(blob.match(r) ?? []);
}

export function normalizeRfcMessageId(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return raw.trim().replace(/^<\s*/, "").replace(/\s*>$/, "");
}

function splitReferences(ref: string | null | undefined): string[] {
  if (!ref?.trim()) return [];
  return ref.split(/\s+/).map(normalizeRfcMessageId).filter((x): x is string => Boolean(x));
}

export type OperationalInboundTransport = "resend" | "ses_sns" | "ses_forwarder";

export type IngestOperationalInboundEmailInput = {
  transport: OperationalInboundTransport;
  from: string;
  to: string[];
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  dedupeExternalId?: string | null;
  rfcMessageId?: string | null;
  inReplyTo?: string | null;
  referencesHeader?: string | null;
  /** Full envelope stored on `EmailMessage.rawPayload`. */
  rawEnvelope: Record<string, unknown>;
  /** Header blob used for heuristic quarantine detection (newline-joined optional). */
  headerFingerprint?: string | null;
};

export type IngestOperationalInboundEmailResult =
  | { ok: true; threadId: string; messageId: string; linkedOrders: string[]; quarantine: boolean }
  | {
      ok: false;
      code: "SKIPPED_MAILBOX_FILTER" | "RATE_LIMIT_SENDER_DAY" | "S3_BODY_REQUIRED";
      detail?: Record<string, unknown>;
    };

const DAY_MS = 24 * 60 * 60 * 1000;
const OPS_INBOUND_RL_MAX_DEFAULT = Number.parseInt(process.env.SES_OPS_INBOUND_RL_PER_SENDER_DAY ?? "", 10);
const OPS_RL_MAX =
  Number.isFinite(OPS_INBOUND_RL_MAX_DEFAULT) && OPS_INBOUND_RL_MAX_DEFAULT > 0
    ? OPS_INBOUND_RL_MAX_DEFAULT
    : 400;

async function locateThreadByCorrelation(opts: {
  replyTokenHint: string | null;
  inReplyToNorm: string | null;
  referencesNorm: ReturnType<typeof splitReferences>;
}): Promise<{ id: string; commerceOrderId: string | null } | null> {
  const { replyTokenHint, inReplyToNorm, referencesNorm } = opts;

  if (replyTokenHint) {
    const byToken = await prisma.emailThread.findFirst({
      where: { providerThreadKey: replyTokenHint },
      select: { id: true, commerceOrderId: true },
    });
    if (byToken) return byToken;
  }

  const candidateIdsOrdered: string[] = [];
  if (inReplyToNorm) candidateIdsOrdered.push(inReplyToNorm);
  for (const rid of referencesNorm) {
    if (!candidateIdsOrdered.includes(rid)) candidateIdsOrdered.push(rid);
  }

  for (const cid of candidateIdsOrdered) {
    const hit = await prisma.emailMessage.findFirst({
      where: {
        direction: "outbound",
        OR: [{ rfcMessageId: cid }],
      },
      select: {
        thread: { select: { id: true, commerceOrderId: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    if (hit?.thread) return hit.thread;
  }

  return null;
}

function computeOperationalQuarantine(input: IngestOperationalInboundEmailInput): {
  quarantine: boolean;
  reason?: string;
} {
  const fp = `${input.headerFingerprint ?? ""}`;
  const toLower = input.to.map((t) => t.toLowerCase());
  const domain = resolveSesInboundOperationalDomain()?.toLowerCase() ?? "";

  const hasCatering =
    !!domain &&
    toLower.some((e) => matchOperationalRecipient(e, domain)?.kind === "catering");

  const listHdr = /\blist-unsubscribe\b/i.test(fp) || /\blist-unsubscribe\b/i.test(input.subject ?? "");

  if (listHdr && (hasCatering || /\bcatering\b/i.test(input.subject ?? ""))) {
    return { quarantine: true, reason: "list_unsubscribe_to_ops_mailbox_or_subject" };
  }
  return { quarantine: false };
}

/**
 * Persist inbound operational emails — unified path for Svix‑verified Resend and SES/SNS ingestion.
 */
export async function ingestOperationalInboundEmail(
  input: IngestOperationalInboundEmailInput
): Promise<IngestOperationalInboundEmailResult> {
  const from = typeof input.from === "string" ? input.from.trim() : "";
  const to = (input.to ?? []).map((x) => x.trim()).filter(Boolean);

  const subject = typeof input.subject === "string" ? input.subject : "";
  const textBody = input.textBody ?? null;
  const htmlBody = input.htmlBody ?? null;

  const rfcMid = normalizeRfcMessageId(input.rfcMessageId);
  const inReplyToNorm = normalizeRfcMessageId(input.inReplyTo);
  const referencesNorm = splitReferences(input.referencesHeader);

  if (input.transport !== "resend") {
    const domain = resolveSesInboundOperationalDomain();
    if (!domain || !hasOperationalSesRecipient(to, domain)) {
      return {
        ok: false,
        code: "SKIPPED_MAILBOX_FILTER",
        detail: { transport: input.transport },
      };
    }
  }

  const dedupeKey =
    typeof input.dedupeExternalId === "string" && input.dedupeExternalId.trim().length > 0
      ? input.dedupeExternalId.trim()
      : null;

  if (dedupeKey || rfcMid) {
    const dupEarly = await prisma.emailMessage.findFirst({
      where: {
        direction: "inbound",
        OR: [
          ...(dedupeKey ? [{ providerMessageId: dedupeKey }] : []),
          ...(rfcMid ? [{ rfcMessageId: rfcMid }] : []),
        ],
      },
    });
    if (dupEarly) {
      return {
        ok: true,
        threadId: dupEarly.threadId,
        messageId: dupEarly.id,
        linkedOrders: [],
        quarantine: false,
      };
    }
  }

  if (rateLimitHit(`ses-inbound:${from.toLowerCase()}`, { windowMs: DAY_MS, max: OPS_RL_MAX })) {
    void emitPlatformEvent({
      subtype: PLATFORM_EVENT_SUBTYPE.SYSTEM_EMAIL_INBOUND_FAILED,
      category: "SYSTEM_EVENT",
      lifecycle: "failed",
      severity: OperationalActivitySeverity.warning,
      actorType: "service",
      message: "Inbound operational email suppressed by per-sender /24h rate limit",
      detail: {
        transport: input.transport,
        rlKey: `ses-inbound:${from.toLowerCase()}`,
      },
      source: { handler: "ingestOperationalInboundEmail" },
      sourceTag: "email.inbound.rl",
    });
    return {
      ok: false,
      code: "RATE_LIMIT_SENDER_DAY",
      detail: { fromPreview: `${from.slice(0, 3)}***` },
    };
  }

  const domainSes = resolveSesInboundOperationalDomain();
  let replyTokenHint: string | null = null;
  if (domainSes) {
    for (const addr of to) {
      const m = matchOperationalRecipient(addr, domainSes);
      if (m?.kind === "reply") {
        replyTokenHint = m.token;
        break;
      }
    }
  }

  const existingThreadRow = await locateThreadByCorrelation({
    replyTokenHint,
    inReplyToNorm,
    referencesNorm,
  });

  let threadId = existingThreadRow?.id ?? null;

  const blobForOrders = `${subject}\n${textBody ?? ""}`;
  const linkedIds = extractOrderIds(blobForOrders);

  if (!threadId) {
    const commerceOrderId = linkedIds.length === 1 ? linkedIds[0] : null;
    const thread = await prisma.emailThread.create({
      data: {
        subjectSnapshot: subject.slice(0, 512),
        commerceOrderId,
      },
    });
    threadId = thread.id;
  }

  let threadCommerceOrderStill =
    existingThreadRow?.commerceOrderId ??
    (
      await prisma.emailThread.findUnique({
        where: { id: threadId },
        select: { commerceOrderId: true },
      })
    )?.commerceOrderId ??
    null;

  const quarantineDecision = computeOperationalQuarantine(input);

  const momosOperationalPayload = quarantineDecision.quarantine
    ? ({
        momosOperational: {
          quarantine: true,
          ...(quarantineDecision.reason ? { reason: quarantineDecision.reason } : {}),
          transport: input.transport,
        },
      } as Record<string, unknown>)
    : {};

  const msg = await prisma.emailMessage.create({
    data: {
      threadId,
      direction: "inbound",
      fromEmail: from,
      toEmails: (to.length ? to : [`unknown@${domainSes ?? "inbound.invalid"}`]) as unknown as Prisma.InputJsonValue,
      subject: subject.slice(0, 2048),
      textBody,
      htmlBody,
      providerMessageId: dedupeKey ?? undefined,
      rfcMessageId: rfcMid ?? undefined,
      inReplyTo: inReplyToNorm ?? undefined,
      referencesHeader: input.referencesHeader?.trim().slice(0, 8192) || undefined,
      deliveryStatus: "received",
      rawPayload: {
        ...input.rawEnvelope,
        ...momosOperationalPayload,
      } as Prisma.InputJsonValue,
    },
  });

  if (
    linkedIds.length &&
    threadCommerceOrderStill === null &&
    linkedIds.length === 1
  ) {
    await prisma.emailThread.update({
      where: { id: threadId },
      data: { commerceOrderId: linkedIds[0] },
    });
    threadCommerceOrderStill = linkedIds[0];
  }

  for (const oid of linkedIds) {
    await prisma.orderMessageLink.create({
      data: {
        threadId,
        messageId: msg.id,
        orderKind: "commerce_order",
        orderId: oid,
      },
    });
  }

  await appendNotificationEvent(
    "email.inbound.received",
    {
      threadId,
      messageId: msg.id,
      fromEmail: from,
      linkedOrders: linkedIds,
      transport: input.transport,
      quarantine: quarantineDecision.quarantine,
    } as Prisma.InputJsonValue
  );

  void emitPlatformEvent({
    subtype: PLATFORM_EVENT_SUBTYPE.SYSTEM_EMAIL_INBOUND_RECEIVED,
    category: "SYSTEM_EVENT",
    lifecycle: "succeeded",
    severity: OperationalActivitySeverity.info,
    actorType: "service",
    message: "Operational inbound email persisted",
    detail: {
      transport: input.transport,
      ...(quarantineDecision.quarantine
        ? { quarantine: true, reason: quarantineDecision.reason ?? "unknown" }
        : {}),
    },
    entities: { commerceOrderId: threadCommerceOrderStill ?? undefined },
    legacyFlatMetadata: { threadId, emailMessageId: msg.id },
    source: {
      handler: `ingestOperationalInboundEmail(${input.transport})`,
    },
    sourceTag: `api.email.inbound.${input.transport}`,
    skipIncidentEvaluation: true,
  });

  return {
    ok: true,
    threadId,
    messageId: msg.id,
    linkedOrders: linkedIds,
    quarantine: quarantineDecision.quarantine,
  };
}
