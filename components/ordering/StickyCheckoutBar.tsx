"use client";

import { useCart } from "@/context/CartContext";

interface StickyCheckoutBarProps {
  onGoToCheckout: () => void;
  /** When false, bar is hidden (e.g. already on step 2 or 3) */
  visible: boolean;
  orderingDisabled?: boolean;
}

export default function StickyCheckoutBar({ onGoToCheckout, visible, orderingDisabled = false }: StickyCheckoutBarProps) {
  const { count, total } = useCart();

  if (!visible || count === 0) return null;

  return (
    <>
      {/* Mobile: full-width bar fixed above bottom nav */}
      <div
        className="lg:hidden fixed left-0 right-0 bottom-16 z-[650] bg-white border-t-2 border-cream-dark shadow-[0_-4px_20px_rgba(0,0,0,0.08)] p-4 flex justify-between items-center"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div>
          <p className="font-semibold text-[11px] tracking-wider uppercase text-gray-mid">
            {count} item{count !== 1 ? "s" : ""}
          </p>
          <p className="font-display text-[24px] text-charcoal leading-none">
            ${total.toFixed(2)}
          </p>
        </div>
        <button
          type="button"
          onClick={orderingDisabled ? undefined : onGoToCheckout}
          disabled={orderingDisabled}
          className={`py-3 px-6 rounded-lg font-semibold text-sm tracking-wider uppercase transition-all ${
            orderingDisabled
              ? "bg-gray-mid text-white/80 cursor-not-allowed shadow-none"
              : "bg-red text-white shadow-[0_3px_0_#a01e23] hover:opacity-90"
          }`}
        >
          {orderingDisabled ? "Ordering Closed" : "Go to Checkout →"}
        </button>
      </div>

      {/* Desktop: floating bottom-right CTA */}
      <div className="hidden lg:block fixed bottom-6 right-6 z-[650]">
        <button
          type="button"
          onClick={orderingDisabled ? undefined : onGoToCheckout}
          disabled={orderingDisabled}
          className={`flex items-center gap-4 bg-white border-2 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-4 transition-all group ${
            orderingDisabled
              ? "border-cream-dark opacity-60 cursor-not-allowed"
              : "border-cream-dark hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)]"
          }`}
        >
          <div className="text-left">
            <p className="font-semibold text-[11px] tracking-wider uppercase text-gray-mid">
              {count} item{count !== 1 ? "s" : ""}
            </p>
            <p className="font-display text-[22px] text-charcoal leading-none">
              ${total.toFixed(2)}
            </p>
          </div>
          <span className={`py-2.5 px-5 rounded-lg font-semibold text-sm tracking-wider uppercase transition-opacity ${
            orderingDisabled
              ? "bg-gray-mid text-white/80"
              : "bg-red text-white shadow-[0_3px_0_#a01e23] group-hover:opacity-90"
          }`}>
            {orderingDisabled ? "Ordering Closed" : "Go to Checkout →"}
          </span>
        </button>
      </div>
    </>
  );
}
