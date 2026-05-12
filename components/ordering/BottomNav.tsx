"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCommerceCart } from "@/context/CartContext";
import { useCartNav } from "@/context/CartNavContext";
import { formatMoney } from "@/lib/commerce/fulfillmentPreview";

export default function BottomNav() {
  const { totalCount, grandTotal, setDrawerOpen } = useCommerceCart();
  const pathname = usePathname();
  const cartNav = useCartNav();
  const isOrderPage = pathname === "/order";

  const handleCartClick = () => {
    if (isOrderPage) {
      cartNav?.callCartClick();
    } else {
      setDrawerOpen(true);
    }
  };

  const handleMenuScroll = isOrderPage ? cartNav?.callMenuScroll : undefined;

  const ariaMoney = formatMoney(grandTotal);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-[700] bg-cream-mid border-t-2 border-gold shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="max-w-[1140px] mx-auto px-5">
        <div className="flex items-stretch h-14">
          <Link
            href="/"
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 transition-colors ${
              pathname === "/"
                ? "text-red"
                : "text-teal-dark hover:bg-cream-dark/50 active:bg-cream-dark"
            }`}
            aria-label="Home"
          >
            <span className="text-lg" aria-hidden>
              🏠
            </span>
            <span className="font-semibold text-[10px] tracking-wider uppercase">Home</span>
          </Link>

          {isOrderPage && handleMenuScroll ? (
            <button
              type="button"
              onClick={handleMenuScroll}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 text-teal-dark hover:bg-cream-dark/50 active:bg-cream-dark transition-colors"
              aria-label="Scroll to menu"
            >
              <span className="text-lg" aria-hidden>
                📋
              </span>
              <span className="font-semibold text-[10px] tracking-wider uppercase">Menu</span>
            </button>
          ) : (
            <Link
              href="/order"
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 transition-colors ${
                pathname === "/order"
                  ? "text-red"
                  : "text-teal-dark hover:bg-cream-dark/50 active:bg-cream-dark"
              }`}
              aria-label="Order"
            >
              <span className="text-lg" aria-hidden>
                📋
              </span>
              <span className="font-semibold text-[10px] tracking-wider uppercase">Order</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleCartClick}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 text-red hover:bg-red/5 active:bg-red/10 transition-colors relative py-2"
            aria-label={
              totalCount > 0
                ? `View cart, ${totalCount} items, ${ariaMoney}`
                : "View cart"
            }
          >
            <span className="text-lg relative inline-block" aria-hidden>
              🛒
              {totalCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 rounded-full bg-red text-white text-[10px] font-bold flex items-center justify-center">
                  {totalCount}
                </span>
              )}
            </span>
            <span className="font-semibold text-[10px] tracking-wider uppercase">
              {totalCount > 0 ? ariaMoney : "Cart"}
            </span>
          </button>

          <Link
            href="/catering"
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 transition-colors ${
              pathname === "/catering"
                ? "text-red"
                : "text-teal-dark hover:bg-cream-dark/50 active:bg-cream-dark"
            }`}
            aria-label="Catering"
          >
            <span className="text-lg" aria-hidden>
              🥗
            </span>
            <span className="font-semibold text-[10px] tracking-wider uppercase">Catering</span>
          </Link>

          <Link
            href="/find-us"
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 transition-colors ${
              pathname === "/find-us"
                ? "text-red"
                : "text-teal-dark hover:bg-cream-dark/50 active:bg-cream-dark"
            }`}
            aria-label="Find Us"
          >
            <span className="text-lg" aria-hidden>
              📍
            </span>
            <span className="font-semibold text-[10px] tracking-wider uppercase">Find Us</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
