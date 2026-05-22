/**
 * Builds a webhook-shaped body compatible with `extractSquarePaymentWebhookEnvelope` /
 * `reconcileSquarePaymentWebhook` from Square `payments.get` (SDK wrapper) responses —
 * **read-only reconcile**, no charging.
 */

function unwrapPaymentGet(result: unknown): Record<string, unknown> | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const p =
    (r.payment as Record<string, unknown> | undefined) ??
    ((r.body as Record<string, unknown> | undefined)?.payment as Record<string, unknown> | undefined);
  if (!p || typeof p !== "object") return null;
  return p;
}

export function buildSyntheticSquarePaymentWebhookBody(paymentsGetResult: unknown): Record<string, unknown> {
  const payment = unwrapPaymentGet(paymentsGetResult);
  if (!payment) {
    throw new Error("SYNTHETIC_WEBHOOK_BAD_PAYMENT_RESPONSE");
  }
  const id = typeof payment.id === "string" ? payment.id : null;
  const status = typeof payment.status === "string" ? payment.status : null;
  if (!id || !status) throw new Error("SYNTHETIC_WEBHOOK_MISSING_ID_OR_STATUS");

  const referenceIdRaw =
    (typeof payment.reference_id === "string" && payment.reference_id) ||
    (typeof payment.referenceId === "string" && payment.referenceId) ||
    undefined;

  return {
    type: "payment.updated",
    data: {
      type: "payment",
      id,
      object: {
        payment: {
          id,
          status,
          ...(referenceIdRaw ? { reference_id: referenceIdRaw } : {}),
        },
      },
    },
  };
}
