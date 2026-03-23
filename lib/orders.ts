import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { CartItem } from "@/types/ordering";
import type { CafeOrderCustomer, CafeOrderStatus } from "@/types/order";

export interface CreateCafeOrderInput {
  cart: CartItem[];
  customer: CafeOrderCustomer;
  totalCents: number;
  fulfillmentType: string;
  /** ISO 8601 — customer-scheduled pickup; when valid, status starts as `scheduled` */
  scheduledForIso?: string | null;
  /** ISO 8601 — server-computed ASAP estimate (always recommended) */
  estimatedPickupAtIso: string;
  /** Set when checkout used Square Orders API (catalog line items). */
  squareOrderId?: string | null;
}

function parseIsoToIsoOrNull(iso: string | null | undefined): string | null {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function deriveInitialStatus(
  totalCents: number,
  hasValidScheduledFor: boolean
): CafeOrderStatus {
  if (hasValidScheduledFor) return "scheduled";
  if (totalCents <= 0) return "confirmed";
  return "awaiting_payment";
}

/**
 * Persists an order before (or alongside) Square payment.
 * When `squareOrderId` is set, totals should match Square’s computed order total.
 */
export async function createCafeOrder(input: CreateCafeOrderInput): Promise<{ id: string }> {
  const supabase = createSupabaseAdmin();
  const scheduledFor = parseIsoToIsoOrNull(input.scheduledForIso ?? null);
  const hasValidScheduledFor = scheduledFor !== null;
  const status = deriveInitialStatus(input.totalCents, hasValidScheduledFor);
  const estimatedPickupAt = parseIsoToIsoOrNull(input.estimatedPickupAtIso);
  if (!estimatedPickupAt) {
    throw new Error("estimatedPickupAtIso must be a valid ISO date");
  }

  const { data, error } = await supabase
    .from("cafe_orders")
    .insert({
      cart: input.cart,
      customer: input.customer,
      total_cents: input.totalCents,
      fulfillment_type: input.fulfillmentType,
      scheduled_for: scheduledFor,
      estimated_pickup_at: estimatedPickupAt,
      status,
      is_paid: input.totalCents <= 0,
      square_payment_id: null,
      square_order_id: input.squareOrderId?.trim() || null,
      notes: input.customer.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[orders] createCafeOrder error:", error);
    throw new Error(error.message || "Failed to create order");
  }
  if (!data?.id) {
    throw new Error("Failed to create order: no id returned");
  }
  return { id: data.id as string };
}

export async function markCafeOrderPaid(
  orderId: string,
  squarePaymentId: string
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("cafe_orders")
    .update({
      square_payment_id: squarePaymentId,
      status: "paid",
      is_paid: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    console.error("[orders] markCafeOrderPaid error:", error);
    throw new Error(error.message || "Failed to update order payment");
  }
}

export async function markCafeOrderPaymentFailed(orderId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("cafe_orders")
    .update({
      status: "payment_failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    console.error("[orders] markCafeOrderPaymentFailed error:", error);
  }
}
