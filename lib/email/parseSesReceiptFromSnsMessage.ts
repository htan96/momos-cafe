import type { OperationalMailboxMatch } from "@/lib/email/inboundOperationalEnv";
import { matchOperationalRecipient } from "@/lib/email/inboundOperationalEnv";

type SesHeader = { name: string; value: string };

type SesMail = {
  source?: string;
  destination?: string[];
  timestamp?: string;
  headersTruncated?: boolean;
  headers?: SesHeader[];
  commonHeaders?: {
    from?: string[];
    to?: string[];
    messageId?: string;
    subject?: string;
    date?: string;
    inReplyTo?: string[];
    references?: string[];
  };
};

export type SesOperationalParsed = {
  from: string;
  to: string[];
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  rfcMessageId: string | null;
  inReplyTo: string | null;
  referencesHeader: string | null;
  /** SES inbound id (different from RFC Message-ID) — idempotency anchor. */
  sesInternalMessageId: string | null;
  headerFingerprint: string;
  /** True when SES only delivered pointers to object storage — needs phase-2 S3 hydrate. */
  needsS3Content: boolean;
  s3Bucket?: string;
  s3Key?: string;
};

function headerMap(mail: SesMail): Record<string, string> {
  const out: Record<string, string> = {};
  const list = mail.headers ?? [];
  for (const { name, value } of list) {
    const k = typeof name === "string" ? name.toLowerCase() : "";
    if (k && typeof value === "string") out[k] = value;
  }
  return out;
}

/** Extract MIME part bodies — best-effort for operational mail (no full parser dependency). */
function extractMimeParts(raw: string): { text?: string; html?: string } {
  const boundaryMatch = /^[\s\S]*?boundary=(?:"([^"]+)"|([^\s;]+))/im.exec(raw);
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2];
  if (!boundary) {
    const ctype = /^content-type:\s*(text\/plain|text\/html)[^\n]*/im.exec(raw);
    if (ctype?.[1]?.toLowerCase() === "text/plain") {
      const bodySep = /\r?\n\r?\n/;
      const parts = raw.split(bodySep);
      const body = parts.slice(1).join("\n\n").trim();
      return { text: body || undefined };
    }
    if (ctype?.[1]?.toLowerCase() === "text/html") {
      const bodySep = /\r?\n\r?\n/;
      const parts = raw.split(bodySep);
      const body = parts.slice(1).join("\n\n").trim();
      return { html: body || undefined };
    }
    return {};
  }
  const bits = raw.split(new RegExp(`\\r?\\n--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  const out: { text?: string; html?: string } = {};
  for (const chunk of bits) {
    if (!chunk.trim()) continue;
    const hEnd = /\r?\n\r?\n/.exec(chunk);
    if (!hEnd) continue;
    const hdr = chunk.slice(0, hEnd.index);
    const body = chunk.slice(hEnd.index + hEnd[0].length).trim();
    const ct =
      /^content-type:\s*([\w\/\+\-]+)/im.exec(hdr)?.[1]?.toLowerCase().split(";")[0]?.trim() ?? "";
    const trans =
      /^content-transfer-encoding:\s*(.+)$/im.exec(hdr)?.[1]?.trim().toLowerCase() ?? "";
    let decoded = body;
    if (trans.includes("quoted-printable")) {
      decoded = body.replace(/=\r?\n/g, "").replace(/=([0-9a-f]{2})/gi, (_, hex) =>
        String.fromCharCode(Number.parseInt(hex, 16))
      );
    } else if (trans.includes("base64")) {
      try {
        decoded = Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8");
      } catch {
        /* keep raw */
      }
    }
    if (ct === "text/plain") out.text ??= decoded;
    if (ct === "text/html") out.html ??= decoded;
    if (ct === "multipart/alternative") {
      const nested = extractMimeParts(chunk);
      if (nested.text) out.text ??= nested.text;
      if (nested.html) out.html ??= nested.html;
    }
  }
  return out;
}

function unwrapAngle(id: string | null | undefined): string | null {
  if (!id?.trim()) return null;
  return id.trim().replace(/^<\s*/, "").replace(/\s*>$/, "");
}

/** Parse SES "Received" JSON embedded in SNS Message string. Returns null when not actionable. */
export function parseSesReceiptFromInnerMessage(opts: {
  inner: Record<string, unknown>;
  operationalDomain: string | null;
}): { parsed: SesOperationalParsed; matchedRecipients: OperationalMailboxMatch[] } | null {
  if (opts.inner.notificationType !== "Received") {
    return null;
  }
  const mail = opts.inner.mail as SesMail | undefined;
  if (!mail) return null;

  const receipt = opts.inner.receipt as
    | {
        action?: unknown;
        recycleBin?: unknown;
      }
    | undefined;

  let needsS3 = false;
  let s3Bucket: string | undefined;
  let s3Key: string | undefined;

  const actionsRaw = receipt?.action;
  const actions: Array<{ type?: string; bucketName?: string; objectKeyPrefix?: string; objectKey?: string }> =
    Array.isArray(actionsRaw)
      ? (actionsRaw.filter((x) => typeof x === "object") as typeof actions)
      : actionsRaw &&
          typeof actionsRaw === "object" &&
          actionsRaw !== null &&
          typeof (actionsRaw as { type?: string }).type === "string"
        ? [actionsRaw as (typeof actions)[number]]
        : [];

  const s3Acts = actions.filter((a) => a.type?.toUpperCase?.() === "S3");
  if (s3Acts.length > 0) {
    const s = s3Acts[0];
    needsS3 = true;
    s3Bucket = typeof s.bucketName === "string" ? s.bucketName : undefined;
    s3Key =
      (typeof s.objectKey === "string" && s.objectKey) ||
      (typeof s.objectKeyPrefix === "string" ? s.objectKeyPrefix : undefined);
  }

  const hm = headerMap(mail);
  const fp = (mail.headers ?? [])
    .filter((h): h is SesHeader => typeof h.name === "string" && typeof h.value === "string")
    .map((h) => `${h.name}:${h.value}`)
    .join("\n");
  const common = mail.commonHeaders ?? {};

  const from =
    (mail.source && typeof mail.source === "string" && mail.source) ||
    headerMap(mail)["from"] ||
    common.from?.[0] ||
    "unknown@invalid";

  const destinations = [...(mail.destination ?? []), ...(common.to ?? [])].filter(
    (x): x is string => typeof x === "string" && !!x.trim()
  );
  const toUnique = [...new Set(destinations.map((x) => x.trim()))];

  const sesInternalMessageId = typeof (mail as { messageId?: unknown }).messageId === "string"
    ? ((mail as { messageId: string }).messageId.trim() || null)
    : null;

  const subject = common.subject ?? hm["subject"] ?? "";
  const rfcMessageId = unwrapAngle(common.messageId) ?? unwrapAngle(hm["message-id"]) ?? null;

  const inReplyToRaw =
    common.inReplyTo?.[0] ?? hm["in-reply-to"] ?? hm["reply-to"] ?? null;
  const refs =
    common.references?.join(" ") ??
    hm["references"] ??
    null;

  const inReplyTo = inReplyToRaw ? unwrapAngle(inReplyToRaw) : null;

  let textBody: string | null = null;
  let htmlBody: string | null = null;

  const rawB64 =
    typeof opts.inner.content === "string" ? opts.inner.content.trim() : "";
  if (rawB64.length > 0) {
    try {
      const raw = Buffer.from(rawB64, "base64").toString("utf8");
      const parts = extractMimeParts(raw);
      textBody = parts.text ?? null;
      htmlBody = parts.html ?? null;
      if ((!textBody && !htmlBody) && raw.trim().length > 0) {
        textBody = raw.slice(0, 100_000);
      }
      needsS3 = false;
    } catch {
      /* noop */
    }
  }

  const matched: OperationalMailboxMatch[] = [];
  if (opts.operationalDomain) {
    for (const addr of toUnique) {
      const m = matchOperationalRecipient(addr, opts.operationalDomain);
      if (m) matched.push(m);
    }
  }

  return {
    parsed: {
      from,
      to: toUnique,
      subject,
      textBody,
      htmlBody,
      rfcMessageId,
      inReplyTo,
      referencesHeader: refs,
      sesInternalMessageId,
      headerFingerprint: fp,
      needsS3Content:
        needsS3 && !textBody && !htmlBody && Boolean(s3Bucket && s3Key),
      ...(s3Bucket ? { s3Bucket } : {}),
      ...(s3Key ? { s3Key } : {}),
    },
    matchedRecipients: matched,
  };
}
