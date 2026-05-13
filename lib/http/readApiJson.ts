/**
 * Parse a fetch `Response` as JSON without throwing when the body is HTML or plain text
 * (common for 404/502 pages, error overlays, or reverse proxies).
 */
export type ReadApiJsonResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; data: null; status: number; error: string };

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
      error: looksHtml
        ? `Something went wrong on our servers (HTTP ${status}). Please try again in a moment.`
        : `The server sent an unexpected response (HTTP ${status}). Please try again.`,
    };
  }

  try {
    const data = JSON.parse(text) as T;
    return { ok: true, data, status };
  } catch {
    return {
      ok: false,
      data: null,
      status,
      error: `We could not read the server response (HTTP ${status}). Please try again.`,
    };
  }
}
