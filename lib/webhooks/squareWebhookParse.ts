/** Square Notifications API envelope — snake_case ids at root. */

export type SquareWebhookRootFields = {
  eventType: string | undefined;
  externalEventId: string | undefined;
};

export function parseSquareWebhookRoot(body: Record<string, unknown>): SquareWebhookRootFields {
  const eventType = typeof body.type === "string" ? body.type : undefined;
  const externalEventId =
    typeof body.event_id === "string"
      ? body.event_id
      : typeof body.eventId === "string"
        ? body.eventId
        : undefined;
  return { eventType, externalEventId };
}

export function readCorrelationRequestId(req: Request): string | undefined {
  const raw =
    req.headers.get("x-vercel-id") ??
    req.headers.get("x-request-id") ??
    req.headers.get("cf-ray") ??
    req.headers.get("x-amzn-requestid") ??
    req.headers.get("x-correlation-id");
  const t = raw?.trim();
  return t || undefined;
}
