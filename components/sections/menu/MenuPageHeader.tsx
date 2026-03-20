"use client";

import Link from "next/link";

interface MenuPageHeaderProps {
  cartCount: number;
  cartTotal: number;
  onCartClick: () => void;
}

export default function MenuPageHeader({
  cartCount,
  cartTotal,
  onCartClick,
}: MenuPageHeaderProps) {
  return (
    <header className="sticky top-0 z-[900] bg-cream border-b-[3px] border-gold h-16">
      <div className="max-w-[1200px] mx-auto px-5 h-full flex items-center justify-between gap-4">
        <Link
          href="/"
          className="font-semibold text-sm tracking-wider uppercase text-teal-dark flex items-center gap-1.5 hover:text-red transition-colors"
        >
          ← Back
        </Link>
        <Link
          href="/"
          className="font-display text-[22px] text-teal-dark tracking-wide flex-shrink-0"
        >
          MOMO&apos;S <span className="text-red">CAFÉ</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm text-gray-mid tracking-wide hidden sm:inline">
            Order Pickup
          </span>
          <button
            onClick={onCartClick}
            className="bg-red text-white rounded-lg flex items-center gap-2 py-2 px-4 font-semibold text-sm tracking-wider uppercase shadow-[0_3px_0_#A01E23] hover:-translate-y-0.5 transition-all"
          >
            🛒
            {cartCount > 0 && (
              <span className="bg-white text-red text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
            <span>${cartTotal.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
