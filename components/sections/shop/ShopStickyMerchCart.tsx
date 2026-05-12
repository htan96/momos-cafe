"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useMerchCartOptional } from "@/context/MerchCartContext";
import MerchBagDrawer from "./MerchBagDrawer";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function ShopStickyMerchCart() {
  const pathname = usePathname();
  const cart = useMerchCartOptional();
  const [open, setOpen] = useState(false);

  if (pathname !== "/shop" || !cart) return null;

  const { count, subtotal } = cart;
  const showBar = count > 0;

  return (
    <>
      {showBar && (
        <div className="fixed left-0 right-0 z-[90] px-3 pointer-events-none bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-6 md:px-6 md:flex md:justify-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pointer-events-auto w-full md:w-auto md:min-w-[320px] flex items-center justify-between gap-3 rounded-2xl bg-charcoal text-cream px-4 py-3 shadow-[0_8px_28px_-6px_rgba(0,0,0,0.45)] ring-2 ring-white/10 hover:bg-teal-dark transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-charcoal font-bold text-sm">
                {count}
              </span>
              <span className="text-left">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                  Shop bag
                </span>
                <span className="font-semibold text-sm">{formatMoney(subtotal)}</span>
              </span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gold shrink-0">
              Review →
            </span>
          </button>
        </div>
      )}

      <MerchBagDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
