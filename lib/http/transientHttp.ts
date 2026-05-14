/** Statuses where the client should not treat the failure as a signed-out session. */
export function isTransientHttpStatus(status: number): boolean {
  return (
    status === 0 ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 520 ||
    status === 521
  );
}
