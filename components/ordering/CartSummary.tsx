"use client";

import { useMemo } from "react";
import { useCart } from "@/context/CartContext";
import CartOrderSummary from "./CartOrderSummary";
import { getEstimatedPickupTime, formatPickupTime } from "@/lib/pickupTime";

interface CartSummaryProps {
  onNext: () => void;
  orderingDisabled?: boolean;
}

export default function CartSummary({ onNext, orderingDisabled = false }: CartSummaryProps) {
  const { items, total, count } = useCart();
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const estimatedPickupTime = useMemo(
    () => (itemCount > 0 ? getEstimatedPickupTime(itemCount) : null),
    [itemCount]
  );

  return (
    <div className="flex flex-col" aria-label="Your order">
      <div className="px-5 py-4 border-b border-cream-dark flex justify-between items-center">
        <span className="font-semibold text-[11px] text-gray-mid tracking-wider uppercase">
          {count} item{count !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="p-4">
        <CartOrderSummary
          showQuantityControls
          variant="sidebar"
          emptyMessage="Add items from the menu to get started"
        />
      </div>

      {items.length > 0 && (
        <div className="p-4 border-t border-cream-dark bg-cream-mid">
          <div className="flex justify-between items-baseline mb-3">
            <span className="font-semibold text-xs tracking-wider uppercase text-gray-mid">
              Subtotal
            </span>
            <strong className="font-display text-[26px] text-charcoal">
              ${total.toFixed(2)}
            </strong>
          </div>
          <button
            type="button"
            onClick={orderingDisabled ? undefined : onNext}
            disabled={orderingDisabled}
            className={`w-full py-3.5 px-6 rounded-lg font-semibold text-sm tracking-wider uppercase transition-all ${
              orderingDisabled
                ? "bg-gray-mid text-white/80 cursor-not-allowed shadow-none"
                : "bg-red text-white shadow-[0_3px_0_#800] hover:opacity-90"
            }`}
          >
            {orderingDisabled ? "Ordering is unavailable" : "Continue to Checkout →"}
          </button>
          <p className="text-[11px] text-charcoal/40 text-center mt-2 font-medium tracking-wide">
            {orderingDisabled
              ? "Come back again at 8 AM."
              : estimatedPickupTime
                ? `Pickup · Est. ${formatPickupTime(estimatedPickupTime)} · Vallejo`
                : "Pickup · Vallejo"}
          </p>
        </div>
      )}
    </div>
  );
}
