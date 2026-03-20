"use client";

import { useCart } from "@/context/CartContext";
import CartOrderSummary from "./CartOrderSummary";

interface CartSidebarProps {
  onCheckoutClick?: () => void;
  className?: string;
}

export default function CartSidebar({ onCheckoutClick, className = "" }: CartSidebarProps) {
  const { items, total, count } = useCart();

  return (
    <aside
      className={`bg-white border-[1.5px] border-cream-dark rounded-2xl overflow-hidden flex flex-col ${className}`}
      aria-label="Your cart"
    >
      <div className="bg-teal-dark px-5 py-4 flex items-center justify-between border-b-2 border-gold flex-shrink-0">
        <h3 className="font-display text-[22px] text-cream">Your Order</h3>
        <span className="font-semibold text-[11px] text-white/55 tracking-wider uppercase">
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
        <div className="p-4 border-t border-cream-dark bg-cream-mid flex-shrink-0">
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
            onClick={onCheckoutClick}
            className="w-full py-3 rounded-lg bg-red text-white font-semibold text-sm tracking-wider uppercase shadow-[0_3px_0_#a01e23] hover:opacity-90 transition-all"
          >
            Go to Checkout →
          </button>
          <p className="text-[11px] text-charcoal/40 text-center mt-2 font-medium tracking-wide">
            Pickup at Morgen&apos;s Kitchen · ~15 min
          </p>
        </div>
      )}
    </aside>
  );
}
