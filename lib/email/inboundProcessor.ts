import {
  ingestOperationalInboundEmail,
  type IngestOperationalInboundEmailResult,
} from "@/lib/email/ingestOperationalInboundEmail";

function extractAddresses(blob: unknown): string[] {
  if (!blob) return [];
  if (typeof blob === "string") return [blob];
  if (Array.isArray(blob)) return blob.flatMap(extractAddresses);
  if (typeof blob === "object" && blob !== null && "email" in blob) {
    const e = (blob as { email?: string }).email;
    return typeof e === "string" ? [e] : [];
  }
  return [];
}

function pickHeader(headers: Record<string, unknown> | undefined, keys: string[]) {
  if (!headers) return undefined;
  for (const k of keys) {
    const v = headers[k] ?? headers[k.toLowerCase() as keyof typeof headers];
    if (typeof v === "string") return v;
  }
  return undefined;
}

function assertIngestOkay(
  r: IngestOperationalInboundEmailResult
): asserts r is {
  ok: true;
  threadId: string;
  messageId: string;
  linkedOrders: string[];
  quarantine: boolean;
} {
  if (!r.ok) {
    throw new Error(`resend ingest unexpected ${r.code}`);
  }
}

/** Flexible parser — Resend evolves payloads; we persist raw JSON for forward-compat. */
export async function persistInboundEmailEvent(payload: Record<string, unknown>): Promise<{
  threadId: string;
  messageId: string;
  linkedOrders: string[];
}> {
  const data = (payload.data ?? payload) as Record<string, unknown>;
  const from =
    (typeof data.from === "string" && data.from) ||
    extractAddresses(data.from)[0] ||
    "unknown@invalid";
  const to =
    extractAddresses(data.to).length > 0
      ? extractAddresses(data.to)
      : extractAddresses(data.recipients);
  const subject = typeof data.subject === "string" ? data.subject : "";
  const textBody =
    typeof data.text === "string" ? data.text : typeof data.body === "string" ? data.body : null;
  const htmlBody = typeof data.html === "string" ? data.html : null;

  const dedupeKey =
    (typeof data.email_id === "string" && data.email_id) ||
    (typeof data.id === "string" && data.id) ||
    null;

  const headers = data.headers as Record<string, unknown> | undefined;
  const rfcMessageId =
    pickHeader(headers, ["Message-ID", "Message-Id", "message-id"]) ??
    (typeof data.message_id === "string" ? data.message_id : null);
  const inReplyTo = pickHeader(headers, ["In-Reply-To", "in-reply-to"]);
  const referencesHeader = pickHeader(headers, ["References", "references"]);

  let headerFingerprint: string | undefined;
  if (headers && typeof headers === "object") {
    headerFingerprint = Object.entries(headers as Record<string, unknown>)
      .map(([k, v]) =>
        `${k}:${typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : ""}`
      )
      .join("\n");
  }

  const out = await ingestOperationalInboundEmail({
    transport: "resend",
    from,
    to,
    subject,
    textBody,
    htmlBody,
    dedupeExternalId: dedupeKey,
    rfcMessageId,
    inReplyTo,
    referencesHeader,
    rawEnvelope: payload as unknown as Record<string, unknown>,
    ...(headerFingerprint ? { headerFingerprint } : {}),
  });

  assertIngestOkay(out);

  return { threadId: out.threadId, messageId: out.messageId, linkedOrders: out.linkedOrders };
}
