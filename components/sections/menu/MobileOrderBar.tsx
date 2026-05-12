"use client";

import { formatMoney } from "@/lib/commerce/fulfillmentPreview";

interface MobileOrderBarProps {
  itemCount: number;
  total: number;
  onOpenCart: () => void;
  orderingDisabled?: boolean;
}

export default function MobileOrderBar({
  itemCount,
  total,
  onOpenCart,
  orderingDisabled = false,
}: MobileOrderBarProps) {
  return (
    <div className="fixed left-0 right-0 z-[905] px-3 pointer-events-none bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden">
      <button
        type="button"
        onClick={onOpenCart}
        className="pointer-events-auto w-full flex items-center justify-between gap-3 rounded-2xl bg-charcoal text-cream px-4 py-3 shadow-[0_8px_28px_-6px_rgba(0,0,0,0.45)] ring-2 ring-white/10 hover:bg-teal-dark transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-charcoal font-bold text-sm shrink-0">
            {itemCount}
          </span>
          <span className="text-left min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
              Your cart
            </span>
            <span className="font-semibold text-sm truncate">{formatMoney(total)}</span>
            {orderingDisabled ? (
              <span className="block text-[10px] text-white/60 mt-0.5 leading-snug">
                Kitchen checkout may pause — bag stays saved
              </span>
            ) : null}
          </span>
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-gold shrink-0">Review →</span>
      </button>
    </div>
  );
}
