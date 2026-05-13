/**
 * Parse a fetch `Response` as JSON without throwing when the body is HTML or plain text
 * (common for 404/502 pages, error overlays, or reverse proxies).
 *
 * Note: Some hosts return **502/503 with an HTML body** when the serverless worker crashes,
 * times out, or the edge cannot reach origin — not JSON from this app. Those responses still
 * surface here as `ok: false` with an HTML-derived message.
 */
export type ReadApiJsonResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; data: null; status: number; error: string };

function devResponseHints(headers: Headers, contentType: string): string {
  const parts: string[] = [];
  if (contentType) parts.push(`content-type=${contentType}`);
  const server = headers.get("server");
  if (server) parts.push(`server=${server}`);
  const vercelId = headers.get("x-vercel-id");
  if (vercelId) parts.push(`x-vercel-id=${vercelId}`);
  const cfRay = headers.get("cf-ray");
  if (cfRay) parts.push(`cf-ray=${cfRay}`);
  return parts.length ? ` (${parts.join(", ")})` : "";
}

/** Status codes often used by CDNs / load balancers when the app never returned a response body. */
function isLikelyGatewayOrEdgeStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504 || status === 520 || status === 521;
}

function nonJsonBodyMessage(
  status: number,
  looksHtml: boolean,
  headers: Headers,
  contentType: string
): string {
  const devSuffix =
    process.env.NODE_ENV === "development" ? devResponseHints(headers, contentType) : "";

  if (looksHtml) {
    if (isLikelyGatewayOrEdgeStatus(status)) {
      return (
        `The connection failed before our app could respond (HTTP ${status}) — often a hosting or ` +
        `network issue. Please try again shortly.` +
        devSuffix
      );
    }
    return (
      `Something went wrong on our servers (HTTP ${status}). Please try again in a moment.` + devSuffix
    );
  }

  const base = isLikelyGatewayOrEdgeStatus(status)
    ? `The gateway returned a non-JSON response (HTTP ${status}). Please try again.`
    : `The server sent an unexpected response (HTTP ${status}). Please try again.`;

  return base + devSuffix;
}

export async function readApiJson<T>(res: Response): Promise<ReadApiJsonResult<T>> {
  const status = res.status;
  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
  const text = await res.text();
  const trimmed = text.trimStart();
  const isJsonContentType = contentType.includes("application/json");
  const looksLikeJson = trimmed.startsWith("{") || trimmed.startsWith("[");

  if (!isJsonContentType && !looksLikeJson) {
    const looksHtml = /<html[\s>]/i.test(text) || trimmed.startsWith("<!doctype");
    return {
      ok: false,
      data: null,
      status,
      error: nonJsonBodyMessage(status, looksHtml, res.headers, contentType),
    };
  }

  try {
    const data = JSON.parse(text) as T;
    return { ok: true, data, status };
  } catch {
    const devSuffix =
      process.env.NODE_ENV === "development" ? devResponseHints(res.headers, contentType) : "";
    return {
      ok: false,
      data: null,
      status,
      error: `We could not read the server response (HTTP ${status}). Please try again.` + devSuffix,
    };
  }
}
