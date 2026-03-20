"use client";

import { useMemo } from "react";
import type { CartItem } from "@/types/ordering";
import { getCartItemTotal } from "@/types/ordering";
import { getEstimatedPickupTime, formatPickupTime } from "@/lib/pickupTime";

interface CartSidebarProps {
  items: CartItem[];
  total: number;
  headerOffset?: number;
  orderingDisabled?: boolean;
  onQtyChange?: (index: number, delta: number) => void;
  onPlaceOrder?: () => void;
}

export default function CartSidebar({
  items,
  total,
  headerOffset = 128,
  orderingDisabled = false,
  onQtyChange,
  onPlaceOrder,
}: CartSidebarProps) {
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const estimatedPickupTime = useMemo(
    () => (itemCount > 0 ? getEstimatedPickupTime(itemCount) : null),
    [itemCount]
  );

  return (
    <aside
      className="sticky bg-white border-[1.5px] border-cream-dark rounded-2xl overflow-hidden flex flex-col hidden lg:flex"
      style={{
        top: `${headerOffset + 52 + 20}px`,
        maxHeight: `calc(100vh - ${headerOffset + 52 + 40}px)`,
      }}
    >
      <div className="bg-teal-dark px-5 py-4 flex items-center justify-between">
        <h3 className="font-display text-[22px] text-cream tracking-wide">
          Your Order
        </h3>
        <span className="font-semibold text-[11px] text-white/60 tracking-wider uppercase">
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="text-center py-10">
            <span className="text-5xl block mb-3 opacity-50">🛒</span>
            <p className="font-semibold text-sm text-gray-mid tracking-wide">
              Your cart is empty
            </p>
            <small className="text-xs text-charcoal/40 block mt-1.5">
              Add items from the menu to get started
            </small>
          </div>
        ) : (
          <div className="space-y-0">
            {items.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="flex gap-3 items-start py-3 border-b border-cream-dark last:border-0"
              >
                <span className="text-2xl flex-shrink-0">🍽️</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-charcoal mb-0.5">
                    {item.name}
                  </div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-[11.5px] text-gray-mid leading-snug">
                      {item.modifiers.map((m) => m.name).join(", ")}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => onQtyChange?.(idx, -1)}
                      className="w-[26px] h-[26px] rounded-full bg-cream-dark flex items-center justify-center text-sm font-bold text-charcoal hover:bg-red/20 hover:text-red transition-colors"
                    >
                      −
                    </button>
                    <span className="font-bold text-sm text-charcoal min-w-[20px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onQtyChange?.(idx, 1)}
                      className="w-[26px] h-[26px] rounded-full bg-cream-dark flex items-center justify-center text-sm font-bold text-charcoal hover:bg-teal-light transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
                <span className="font-display text-xl text-red flex-shrink-0">
                  ${getCartItemTotal(item).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="p-4 border-t border-cream-dark bg-cream-mid">
          <div className="flex justify-between items-center mb-3.5">
            <span className="font-semibold text-sm text-gray-mid tracking-wider uppercase">
              Subtotal
            </span>
            <strong className="font-display text-[28px] text-charcoal">
              ${total.toFixed(2)}
            </strong>
          </div>
          <button
            onClick={orderingDisabled ? undefined : onPlaceOrder}
            disabled={orderingDisabled}
            className={`w-full py-3.5 px-4 rounded-lg font-semibold text-base transition-all ${
              orderingDisabled
                ? "bg-gray-mid text-white/80 cursor-not-allowed shadow-none"
                : "bg-red text-white shadow-[0_3px_0_#A01E23] hover:-translate-y-0.5"
            }`}
          >
            {orderingDisabled ? "Ordering is unavailable" : "Place Order →"}
          </button>
          <p className="text-center text-[11px] text-gray-mid font-medium tracking-wide mt-2.5">
            {orderingDisabled
              ? "Come back again at 8 AM."
              : estimatedPickupTime
                ? `Est. pickup: ${formatPickupTime(estimatedPickupTime)}`
                : "Pickup at Morgen's Kitchen"}
          </p>
        </div>
      )}
    </aside>
  );
}
