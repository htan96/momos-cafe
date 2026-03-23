import type { CartItem } from "@/types/ordering";

export type CafeOrderStatus =
  | "scheduled"
  | "awaiting_payment"
  | "confirmed"
  | "paid"
  | "payment_failed";

export interface CafeOrderCustomer {
  name: string;
  phone: string;
  email: string;
  notes?: string;
}

/** Shown on order confirmation after `/api/order` succeeds. */
export interface OrderPlacedVerification {
  /** False only if server skipped verify (env) or unusual edge case */
  paymentVerified: boolean;
  /** Square payment status after verify (e.g. COMPLETED) */
  squarePaymentStatus?: string;
  squarePaymentId?: string;
  receiptNumber?: string;
  /** $0 checkout — no card charge */
  freeOrder?: boolean;
}

/** Row shape for cafe_orders (JSON-friendly). */
export interface CafeOrderRow {
  id: string;
  created_at: string;
  updated_at: string;
  cart: CartItem[];
  customer: CafeOrderCustomer;
  total_cents: number;
  fulfillment_type: string;
  scheduled_for: string | null;
  estimated_pickup_at: string | null;
  status: CafeOrderStatus;
  is_paid: boolean;
  square_payment_id: string | null;
  notes: string | null;
}
