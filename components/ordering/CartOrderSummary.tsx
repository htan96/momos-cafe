"use client";

import { useCart } from "@/context/CartContext";
import type { CartItem } from "@/types/ordering";
import { getCartItemTotal } from "@/types/ordering";

interface CartOrderSummaryProps {
  /** Show quantity controls (+/-) */
  showQuantityControls?: boolean;
  /** Compact/read-only style for checkout panel */
  variant?: "sidebar" | "checkout";
  /** Empty state message */
  emptyMessage?: string;
  /** Optional class for the container */
  className?: string;
}

function CartItemRow({
  item,
  index,
  onQtyChange,
  variant,
}: {
  item: CartItem;
  index: number;
  onQtyChange?: (index: number, delta: number) => void;
  variant: "sidebar" | "checkout";
}) {
  const total = getCartItemTotal(item);
  const modText = item.modifiers?.map((m) => m.name).join(", ") ?? "";
  const isSidebar = variant === "sidebar";

  return (
    <div
      className={`flex gap-2.5 items-start py-3 ${
        isSidebar ? "border-b border-cream-dark last:border-0" : ""
      }`}
    >
      {isSidebar ? (
        <span className="text-2xl flex-shrink-0">🍽️</span>
      ) : (
        <span className="w-6 h-6 rounded-full bg-teal-dark text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
          {item.quantity}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-charcoal leading-snug">
          {item.name}
        </div>
        {modText && (
          <div className="text-xs text-gray-mid mt-0.5 leading-snug">
            {modText}
          </div>
        )}
        {isSidebar && onQtyChange && (
          <div className="flex items-center gap-2 mt-1.5">
            <button
              type="button"
              onClick={() => onQtyChange(index, -1)}
              className="w-6 h-6 rounded-full bg-cream-dark flex items-center justify-center text-sm font-bold text-charcoal hover:bg-red/20 hover:text-red transition-colors"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="font-semibold text-sm text-charcoal min-w-[18px] text-center">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onQtyChange(index, 1)}
              className="w-6 h-6 rounded-full bg-cream-dark flex items-center justify-center text-sm font-bold text-charcoal hover:bg-teal-light transition-colors"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        )}
      </div>
      <div className="font-display text-lg text-red flex-shrink-0">
        ${total.toFixed(2)}
      </div>
    </div>
  );
}

export default function CartOrderSummary({
  showQuantityControls = true,
  variant = "sidebar",
  emptyMessage = "Add items from the menu to get started",
  className = "",
}: CartOrderSummaryProps) {
  const { items, total, count, updateQuantity } = useCart();

  if (items.length === 0) {
    return (
      <div
        className={`text-center py-8 ${className}`}
        data-cart-empty
        aria-live="polite"
      >
        <span className="text-5xl block mb-2 opacity-45">🛒</span>
        <p className="font-semibold text-sm text-gray-mid tracking-wide">
          Your cart is empty
        </p>
        <small className="text-xs text-charcoal/40 block mt-1">
          {emptyMessage}
        </small>
      </div>
    );
  }

  return (
    <div className={className} data-cart-items={items.length}>
      <div className={variant === "sidebar" ? "" : "divide-y divide-cream-dark"}>
        {items.map((item, i) => (
          <CartItemRow
            key={`${item.id}-${i}`}
            item={item}
            index={i}
            onQtyChange={showQuantityControls ? updateQuantity : undefined}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
}

