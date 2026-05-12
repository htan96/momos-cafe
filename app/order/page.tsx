"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { MenuCategory } from "@/types/menu";
import { useCart, useCommerceCart } from "@/context/CartContext";
import { useCartNav } from "@/context/CartNavContext";
import { useHeaderSubNav } from "@/context/HeaderSubNavContext";
import { useAdminSettings, getOrderingStatus } from "@/lib/useAdminSettings";
import OrderingNoticeBanner from "@/components/menu/OrderingNoticeBanner";
import MenuGrid from "@/components/ordering/MenuGrid";
import CategoryNav from "@/components/ordering/CategoryNav";
import CheckoutFlow from "@/components/ordering/CheckoutFlow";

export default function OrderPage() {
  const router = useRouter();
  const { count } = useCart();
  const { setDrawerOpen, totalCount, grandTotal } = useCommerceCart();
  const { settings } = useAdminSettings();
  const checkoutRef = useRef<{ goToCheckout: () => void } | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const SCROLL_OFFSET = 120;

  const scrollToSection = useCallback((slug: string) => {
    const el = sectionRefs.current[slug];
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top: y, behavior: "smooth" });
  }, []);

  const { setSubNav } = useHeaderSubNav() ?? { setSubNav: () => {} };
  const handleCartClick = useCallback(() => {
    setDrawerOpen(true);
  }, [setDrawerOpen]);

  const cartNav = useCartNav();

  const scrollToMenu = useCallback(() => {
    document.getElementById("menu-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    cartNav?.setOnCartClick(handleCartClick);
    cartNav?.setOnMenuScroll(scrollToMenu);
    return () => {
      cartNav?.setOnCartClick(null);
      cartNav?.setOnMenuScroll(null);
    };
  }, [cartNav, handleCartClick, scrollToMenu]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/menu", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch menu");
        const data = await res.json();
        setCategories(data || []);
      } catch (err) {
        console.error("Error fetching menu:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    setSubNav(
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center min-w-0">
        <CategoryNav categories={categories} onScrollTo={scrollToSection} embeddedInHeader />
      </div>
    );
    return () => setSubNav(null);
  }, [categories, scrollToSection, setSubNav]);

  const orderingStatus = getOrderingStatus(settings);

  return (
    <div className="min-h-screen bg-cream text-charcoal flex flex-col overflow-x-clip">
      {orderingStatus.scheduleNote ? (
        <OrderingNoticeBanner tone="schedule" message={orderingStatus.scheduleNote} />
      ) : null}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6 items-start">
          <div id="menu-section" className="lg:col-span-2 min-w-0">
            <MenuGrid
              categories={categories}
              loading={loading}
              hideCategoryNav
              sectionRefs={sectionRefs}
              orderingDisabled={false}
            />
          </div>

          <div className="hidden lg:block lg:col-span-1">
            <CheckoutFlow
              checkoutRef={checkoutRef}
              onCartClick={handleCartClick}
              onBackToMenu={() =>
                document.getElementById("menu-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              orderingDisabled={false}
            />
          </div>
        </div>
      </div>

      {totalCount > 0 && (
        <button
          type="button"
          onClick={() => router.push("/checkout")}
          className="lg:hidden fixed left-0 right-0 bottom-16 z-[905] bg-cream-mid border-t-2 border-gold shadow-[0_-4px_20px_rgba(0,0,0,0.06)] w-full"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="max-w-[1140px] mx-auto px-5 py-4 flex justify-between items-center">
            <div className="text-left">
              <p className="font-semibold text-[11px] tracking-wider uppercase text-gray-mid">Checkout</p>
              <p className="font-display text-[20px] text-charcoal leading-none">
                {totalCount} line{totalCount !== 1 ? "s" : ""} · ${grandTotal.toFixed(2)}
              </p>
              <p className="text-[11px] text-teal-dark font-semibold mt-0.5">
                {count > 0 ? `${count} for pickup · ` : ""}unified bag
              </p>
            </div>
            <span className="py-2.5 px-5 rounded-lg bg-red text-white font-semibold text-sm tracking-wider uppercase shadow-[0_3px_0_#800]">
              Continue →
            </span>
          </div>
        </button>
      )}

      {/* Spacer bottom nav */}
      <div className={`lg:hidden ${totalCount > 0 ? "h-36" : "h-20"}`} aria-hidden="true" />
    </div>
  );
}
