import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { resolveSesInboundOperationalDomain } from "@/lib/email/inboundOperationalEnv";
import { normalizeRfcMessageId } from "@/lib/email/ingestOperationalInboundEmail";

/**
 * Ensures `EmailThread.providerThreadKey` (reply-token) exists and returns SES threading artifacts.
 */
export async function ensureSesThreadReplyRouting(threadId: string): Promise<
  | null
  | {
      token: string;
      replyToMailbox: string;
      /** Normalized RFC Message-ID (angle brackets stripped) for `EmailMessage.rfc_message_id`. */
      rfcMessageIdStored: string;
      /** Value suitable for SES `Headers` (`Message-ID`, includes brackets). */
      messageIdHeaderValue: string;
    }
> {
  const replyDomain = resolveSesInboundOperationalDomain();
  if (!replyDomain) return null;

  const row = await prisma.emailThread.findUnique({
    where: { id: threadId },
    select: { providerThreadKey: true },
  });

  let token = row?.providerThreadKey?.trim() ?? "";
  if (!token) {
    token = randomBytes(18).toString("base64url").replace(/=+$/u, "").slice(0, 24);
    try {
      await prisma.emailThread.update({
        where: { id: threadId },
        data: { providerThreadKey: token },
      });
    } catch {
      /** Race-safe re-read */
      const reread = await prisma.emailThread.findUnique({
        where: { id: threadId },
        select: { providerThreadKey: true },
      });
      token = reread?.providerThreadKey?.trim() ?? token;
      if (!token) return null;
    }
  }

  const rfcRaw = `<momos.${token}.${Date.now().toString(36)}@${replyDomain}>`;
  const rfcMessageIdStored = normalizeRfcMessageId(rfcRaw);
  if (!rfcMessageIdStored) return null;

  const replyToMailbox = `reply+${token}@${replyDomain}`;
  const messageIdHeaderValue =
    rfcMessageIdStored.startsWith("<") && rfcMessageIdStored.endsWith(">")
      ? rfcMessageIdStored
      : `<${rfcMessageIdStored}>`;

  return { token, replyToMailbox, rfcMessageIdStored, messageIdHeaderValue };
}

export function pickOperationalReplyToMailbox(opts: {
  explicitOutbound?: string | null;
  sesComputedMailbox?: string | null;
}): string | undefined {
  const explicit = opts.explicitOutbound?.trim();
  if (explicit) return explicit;
  const envMailbox = process.env.SES_REPLY_TO?.trim();
  if (envMailbox) return envMailbox;
  return opts.sesComputedMailbox?.trim() || undefined;
}
