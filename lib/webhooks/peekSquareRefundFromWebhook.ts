/** Parse Square refund notification payloads (trusted only after webhook signature verification). */
export function extractSquareRefundWebhookEnvelope(body: Record<string, unknown>): {
  refundId: string;
  paymentId: string;
  status: string;
} | null {
  const eventType = typeof body.type === "string" ? body.type : "";
  if (!/^refund\./i.test(eventType) && !/^payment\.refund\./i.test(eventType)) return null;

  const data = body.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const nestedObj = data.object as Record<string, unknown> | undefined;
  const refund =
    (nestedObj?.refund as Record<string, unknown> | undefined) ??
    (nestedObj?.paymentRefund as Record<string, unknown> | undefined) ??
    ((data.refund ?? data.paymentRefund) as Record<string, unknown> | undefined);

  if (!refund || typeof refund !== "object") return null;

  const refundId = typeof refund.id === "string" ? refund.id : undefined;
  const paymentId =
    (typeof refund.paymentId === "string" ? refund.paymentId : undefined) ??
    (typeof refund.payment_id === "string" ? refund.payment_id : undefined);
  const status = typeof refund.status === "string" ? refund.status : "";

  if (!refundId || !paymentId) return null;
  return { refundId, paymentId, status };
}
