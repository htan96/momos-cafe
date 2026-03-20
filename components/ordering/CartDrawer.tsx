"use client";

import { useCart } from "@/context/CartContext";
import CartOrderSummary from "./CartOrderSummary";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckoutClick?: () => void;
  orderingDisabled?: boolean;
}

export default function CartDrawer({
  isOpen,
  onClose,
  onCheckoutClick,
  orderingDisabled = false,
}: CartDrawerProps) {
  const { items, total } = useCart();

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleCheckout = () => {
    if (orderingDisabled) return;
    onClose();
    onCheckoutClick?.();
  };

  return (
    <div
      className={`fixed inset-0 z-[1800] bg-black/50 backdrop-blur-sm transition-opacity duration-250 ${
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Cart drawer"
    >
      <div
        className={`fixed right-0 top-0 bottom-0 z-[1900] w-full max-w-[400px] bg-white flex flex-col shadow-[0_12px_48px_rgba(0,0,0,0.18)] transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-teal-dark px-5 py-4 flex items-center justify-between border-b-2 border-gold flex-shrink-0">
          <h3 className="font-display text-2xl text-cream">Your Order</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <CartOrderSummary
            showQuantityControls
            variant="sidebar"
            emptyMessage="Add items from the menu"
          />
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-cream-dark bg-cream-mid flex-shrink-0">
            <div className="flex justify-between items-baseline mb-2.5">
              <span className="font-semibold text-xs tracking-wider uppercase text-gray-mid">
                Subtotal
              </span>
              <strong className="font-display text-[26px] text-charcoal">
                ${total.toFixed(2)}
              </strong>
            </div>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={orderingDisabled}
              className={`w-full py-3.5 rounded-lg font-semibold text-[15px] tracking-wider uppercase transition-all ${
                orderingDisabled
                  ? "bg-gray-mid text-white/80 cursor-not-allowed shadow-none"
                  : "bg-red text-white shadow-[0_3px_0_#a01e23] hover:opacity-90"
              }`}
            >
              {orderingDisabled ? "Ordering is unavailable" : "Checkout →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
