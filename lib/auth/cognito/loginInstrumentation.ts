const LOG_LABEL = "[cognito/login]";

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

/** Safe for JSON log lines (Error.cause is often serialized poorly if passed raw). */
export function serializeCauseForLog(cause: unknown): string | undefined {
  if (cause == null) return undefined;
  if (cause instanceof Error) {
    return `${cause.name}: ${cause.message}${cause.stack ? `\n${cause.stack}` : ""}`;
  }
  return String(cause);
}

type SuccessMeta<T> = Record<string, unknown> | ((value: T) => Record<string, unknown>);

/**
 * Runs a stage, logs structured JSON on success (duration + optional metadata) or failure (stack, cause, message).
 * Re-throws after failure logging so callers can map to JSON responses.
 */
export async function runStage<T>(
  stage: string,
  fn: () => Promise<T>,
  successMeta?: SuccessMeta<T>
): Promise<T> {
  const start = Date.now();
  try {
    const value = await fn();
    const extra = typeof successMeta === "function" ? successMeta(value) : successMeta ?? {};
    console.error(LOG_LABEL, JSON.stringify({ stage, ok: true, durationMs: Date.now() - start, ...extra }));
    return value;
  } catch (err) {
    const e = toError(err);
    console.error(
      LOG_LABEL,
      JSON.stringify({
        stage,
        ok: false,
        durationMs: Date.now() - start,
        name: e.name,
        message: String(e),
        stack: e.stack,
        cause: serializeCauseForLog(e.cause),
      })
    );
    throw err;
  }
}

/** Point-in-time event (e.g. initiate_auth before/after) with the same label for grepping. */
export function logCognitoLoginEvent(stage: string, meta: Record<string, unknown>): void {
  console.error(LOG_LABEL, JSON.stringify({ stage, ok: true, event: true, ...meta }));
}
