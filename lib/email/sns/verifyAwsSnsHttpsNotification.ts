import { createHash, createVerify } from "crypto";
import { request as httpsRequest } from "node:https";

/** Fields present on parsed SNS HTTPS notification bodies (subset). */
export type AwsSnsHttpsBody = {
  Type: string;
  MessageId: string;
  TopicArn?: string;
  SubscribeURL?: string;
  SignatureVersion?: string | number;
  Signature: string;
  SigningCertURL: string;
  Message?: string;
  Subject?: string;
  Timestamp: string;
  Token?: string;
};

const SNS_CERT_HOST_RE =
  /^sns\.([a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])\.)amazonaws\.com$/i;

function isAllowedSigningCertUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "https:") return false;
    return SNS_CERT_HOST_RE.test(u.hostname);
  } catch {
    return false;
  }
}

/** Fetch PEM certificate chain from SigningCertURL (hostname allowlisted). */
function fetchSigningCertPem(signingCertUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isAllowedSigningCertUrl(signingCertUrl)) {
      reject(new Error("SNS_CERT_URL_NOT_ALLOWED"));
      return;
    }
    const chunks: Buffer[] = [];
    const req = httpsRequest(
      signingCertUrl,
      { method: "GET", timeout: 10_000 },
      (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          reject(new Error(`SNS_CERT_HTTP_${res.statusCode}`));
          res.resume();
          return;
        }
        res.on("data", (c) => chunks.push(Buffer.from(c)));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

/**
 * SNS builds the canonical string-to-sign using keys present,
 * arranged in byte-sort (lexical) ascending order — key then "\n" value then "\n".
 * @see https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message-verify-message-signature.html
 */
export function snsBuildCanonicalString(message: AwsSnsHttpsBody): string {
  const keys = (
    ["Message", "MessageId", "Subject", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"] as const
  ).filter((key) => {
    const raw = message[key as keyof AwsSnsHttpsBody];
    return typeof raw === "string";
  }).sort(); // lexical order

  let out = "";
  for (const k of keys) {
    const v = message[k as keyof AwsSnsHttpsBody];
    out += `${k}\n${v as string}\n`;
  }
  return out;
}

function snsTimestampFresh(ts: string, maxSkewMinutes: number): boolean {
  const d = Date.parse(ts);
  if (!Number.isFinite(d)) return false;
  const skew = Math.abs(Date.now() - d);
  return skew <= maxSkewMinutes * 60_000;
}

export type VerifyAwsSnsNotificationOptions = {
  /** When set, `TopicArn` must match exactly. */
  expectedTopicArn?: string;
  /** Reject payloads older/newer than this skew (replay guard). Default 60. */
  maxTimestampSkewMinutes?: number;
};

/**
 * Validates AWS SNS HTTPS message signature (`SignatureVersion` 1_SHA1 vs 2_SHA256).
 * Returns parsed body when verified; otherwise throws.
 */
export async function verifyAwsSnsHttpsBody(
  body: AwsSnsHttpsBody,
  rawBodyForFingerprint: string,
  opts?: VerifyAwsSnsNotificationOptions
): Promise<void> {
  void rawBodyForFingerprint;
  const type = typeof body.Type === "string" ? body.Type : "";
  if (!type || !body.MessageId || typeof body.Signature !== "string") {
    throw new Error("SNS_BODY_INCOMPLETE");
  }
  const allowedTypes = ["Notification", "SubscriptionConfirmation", "UnsubscribeConfirmation"];
  if (!allowedTypes.includes(type)) {
    throw new Error(`SNS_TYPE_UNSUPPORTED:${type}`);
  }
  if (opts?.expectedTopicArn && body.TopicArn !== opts.expectedTopicArn) {
    throw new Error("SNS_TOPIC_ARN_MISMATCH");
  }

  const maxSkew = opts?.maxTimestampSkewMinutes ?? 60;
  if (!snsTimestampFresh(body.Timestamp, maxSkew)) {
    throw new Error("SNS_TIMESTAMP_STALE");
  }

  if (typeof body.SigningCertURL !== "string" || typeof body.Signature !== "string") {
    throw new Error("SNS_MISSING_SIGNATURE_FIELDS");
  }

  const algo =
    typeof body.SignatureVersion === "number" || String(body.SignatureVersion ?? "") === "2"
      ? "RSA-SHA256"
      : "RSA-SHA1";

  let pem: string;
  try {
    pem = await fetchSigningCertPem(body.SigningCertURL);
  } catch {
    throw new Error("SNS_CERT_FETCH_FAILED");
  }

  const canonical = snsBuildCanonicalString(body);

  try {
    const verifier = createVerify(algo);
    verifier.update(canonical, "utf8");
    verifier.end();
    const ok = verifier.verify(pem, body.Signature, "base64");
    if (!ok) throw new Error("SNS_SIGNATURE_INVALID");
  } catch (e) {
    if (e instanceof Error && e.message === "SNS_SIGNATURE_INVALID") throw e;
    throw new Error("SNS_SIGNATURE_INVALID");
  }
}

/** Auto-confirmed HTTP GET (per AWS SNS subscription handshake). Returns response status code. */
export async function snsConfirmSubscriptionGet(subscribeUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let u: URL;
    try {
      u = new URL(subscribeUrl);
    } catch {
      reject(new Error("BAD_SUBSCRIBE_URL"));
      return;
    }
    if (u.protocol !== "https:" || !/^sns\.[a-z0-9\-]+\.amazonaws\.com$/i.test(u.hostname)) {
      reject(new Error("SUBSCRIBE_HOST_NOT_ALLOWED"));
      return;
    }
    const req = httpsRequest(
      u,
      { method: "GET", timeout: 15_000 },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 500);
      }
    );
    req.on("error", reject);
    req.end();
  });
}

/** Lightweight fingerprint for webhook receipts / logs — not cryptographic proof. */
export function snsStableFingerprint(canonicalUtf8: string): string {
  return createHash("sha256").update(canonicalUtf8, "utf8").digest("hex");
}
