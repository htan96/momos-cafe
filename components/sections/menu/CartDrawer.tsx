"use client";

import { useMemo } from "react";
import type { CartItem } from "@/types/ordering";
import { getCartItemTotal } from "@/types/ordering";
import { getEstimatedPickupTime, formatPickupTime } from "@/lib/pickupTime";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  orderingDisabled?: boolean;
  onQtyChange?: (index: number, delta: number) => void;
  onPlaceOrder?: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  total,
  orderingDisabled = false,
  onQtyChange,
  onPlaceOrder,
}: CartDrawerProps) {
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const estimatedPickupTime = useMemo(
    () => (itemCount > 0 ? getEstimatedPickupTime(itemCount) : null),
    [itemCount]
  );

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[1500] bg-black/50 backdrop-blur-sm transition-opacity duration-250 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-[1600] w-full max-w-[420px] bg-white flex flex-col shadow-[0_12px_48px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="bg-teal-dark px-5 py-5 flex items-center justify-between border-b-2 border-gold">
          <h3 className="font-display text-[26px] text-cream">
            Your Order
          </h3>
          <button
            onClick={onClose}
            className="w-[34px] h-[34px] rounded-full bg-white/15 text-white flex items-center justify-center text-lg hover:bg-white/25 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-5xl block mb-3 opacity-50">🛒</span>
              <p className="font-semibold text-sm text-gray-mid tracking-wide">
                Your cart is empty
              </p>
              <small className="text-xs text-charcoal/40 block mt-1.5">
                Add items from the menu
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
                        className="w-[26px] h-[26px] rounded-full bg-cream-dark flex items-center justify-center text-sm font-bold text-charcoal hover:bg-teal-light transition-colors"
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
            <div className="flex justify-between items-center mb-3">
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
            {estimatedPickupTime && (
              <p className="text-center text-[11px] text-charcoal/50 font-medium mt-2">
                Est. pickup: {formatPickupTime(estimatedPickupTime)}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
