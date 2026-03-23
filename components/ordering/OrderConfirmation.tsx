"use client";

import type { OrderPlacedVerification } from "@/types/order";

interface OrderConfirmationProps {
  orderNum: string;
  estimatedPickupTime?: string;
  verification?: OrderPlacedVerification | null;
  onOrderAgain: () => void;
}

export default function OrderConfirmation({
  orderNum,
  estimatedPickupTime,
  verification,
  onOrderAgain,
}: OrderConfirmationProps) {
  return (
    <section
      id="order-success-section"
      className="text-center py-14 px-6"
      aria-label="Order confirmation"
    >
      <span className="text-6xl block mb-4">✅</span>
      <h2 className="font-display text-5xl text-teal-dark leading-none mb-2">
        Order Placed!
      </h2>
      <div className="font-semibold text-[13px] tracking-wider uppercase text-gold mb-4">
        Order #{orderNum.length > 8 ? orderNum.slice(-8).toUpperCase() : orderNum}
      </div>
      <p className="text-[15px] text-gray-mid leading-relaxed max-w-[380px] mx-auto mb-2">
        Your order is being prepared. Head to the pickup window at Morgen&apos;s Kitchen.
      </p>
      <p className="text-[15px] font-semibold text-teal-dark mb-1">
        1922 Broadway St, Vallejo
      </p>
      {estimatedPickupTime && (
        <p className="text-[15px] text-gray-mid mb-4">
          Est. ready: {estimatedPickupTime}
        </p>
      )}
      {verification?.freeOrder && (
        <p className="text-[13px] text-teal-dark font-semibold mb-4 max-w-[380px] mx-auto">
          No charge — order confirmed.
        </p>
      )}
      {verification?.paymentVerified && !verification.freeOrder && (
        <div className="rounded-xl border border-teal/25 bg-teal/5 px-4 py-3 max-w-[400px] mx-auto mb-4 text-left">
          <p className="text-[11px] font-bold tracking-wider uppercase text-teal-dark mb-1">
            Payment confirmed with Square
          </p>
          {verification.squarePaymentStatus && (
            <p className="text-[12px] text-charcoal/80">
              Status: <span className="font-semibold">{verification.squarePaymentStatus}</span>
            </p>
          )}
          {verification.squarePaymentId && (
            <p className="text-[11px] text-charcoal/55 mt-1 font-mono break-all">
              Ref: {verification.squarePaymentId}
            </p>
          )}
          {verification.receiptNumber && (
            <p className="text-[12px] text-charcoal/80 mt-1">Receipt: {verification.receiptNumber}</p>
          )}
        </div>
      )}
      {!verification?.paymentVerified && !verification?.freeOrder && verification != null && (
        <p className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-[400px] mx-auto mb-6">
          Payment was processed, but live verification was skipped on the server. If anything looks wrong, contact us with your order #.
        </p>
      )}
      <div className="mb-7" />
      <button
        type="button"
        onClick={onOrderAgain}
        className="inline-flex items-center justify-center font-semibold text-sm tracking-wider uppercase py-3 px-6 rounded-lg bg-transparent text-teal-dark border-2 border-teal hover:bg-teal hover:text-white transition-all"
      >
        Order Again
      </button>
    </section>
  );
}
