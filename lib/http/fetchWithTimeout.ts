export type FetchWithTimeoutInit = RequestInit & { timeoutMs?: number };

/**
 * `fetch` wrapped with an AbortController deadline so hung requests cannot leave UI spinners
 * stuck forever (common pain point on mobile WebKit).
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: FetchWithTimeoutInit = {}
): Promise<Response> {
  const { timeoutMs = 20_000, signal: userSignal, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onUserAbort = () => controller.abort();
  if (userSignal) {
    if (userSignal.aborted) {
      clearTimeout(timer);
      throw userSignal.reason ?? new DOMException("Aborted", "AbortError");
    }
    userSignal.addEventListener("abort", onUserAbort, { once: true });
  }

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    userSignal?.removeEventListener("abort", onUserAbort);
  }
}
