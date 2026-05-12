"use client";

import { usePathname } from "next/navigation";
import { useCommerceCart } from "@/context/CartContext";
import { formatMoney } from "@/lib/commerce/fulfillmentPreview";

export default function ShopStickyMerchCart() {
  const pathname = usePathname();
  const { totalCount, grandTotal, setDrawerOpen } = useCommerceCart();

  if (pathname !== "/shop") return null;

  const showBar = totalCount > 0;

  return (
    <>
      {showBar && (
        <div className="fixed left-0 right-0 z-[90] px-3 pointer-events-none bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-6 md:px-6 md:flex md:justify-center">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="pointer-events-auto w-full md:w-auto md:min-w-[320px] flex items-center justify-between gap-3 rounded-2xl bg-charcoal text-cream px-4 py-3 shadow-[0_8px_28px_-6px_rgba(0,0,0,0.45)] ring-2 ring-white/10 hover:bg-teal-dark transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-charcoal font-bold text-sm">
                {totalCount}
              </span>
              <span className="text-left">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                  Your cart
                </span>
                <span className="font-semibold text-sm">{formatMoney(grandTotal)}</span>
              </span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gold shrink-0">
              Review →
            </span>
          </button>
        </div>
      )}
    </>
  );
}
