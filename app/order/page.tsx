"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { MenuCategory } from "@/types/menu";
import { useCart } from "@/context/CartContext";
import { useCartNav } from "@/context/CartNavContext";
import { useHeaderSubNav } from "@/context/HeaderSubNavContext";
import { useAdminSettings, getOrderingStatus } from "@/lib/useAdminSettings";
import OrderingClosedBanner from "@/components/menu/OrderingClosedBanner";
import MenuGrid from "@/components/ordering/MenuGrid";
import CategoryNav from "@/components/ordering/CategoryNav";
import CheckoutFlow from "@/components/ordering/CheckoutFlow";
import MobileCheckoutOverlay from "@/components/ordering/MobileCheckoutOverlay";
import CartDrawer from "@/components/ordering/CartDrawer";

export default function OrderPage() {
  const { count, total } = useCart();
  const { settings } = useAdminSettings();
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [mobileCheckoutOpen, setMobileCheckoutOpen] = useState(false);
  const checkoutRef = useRef<{ goToCheckout: () => void } | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Header (64px) + category bar (48px) = 112px; use 120px for buffer
  const SCROLL_OFFSET = 120;

  const scrollToSection = useCallback((slug: string) => {
    const el = sectionRefs.current[slug];
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top: y, behavior: "smooth" });
  }, []);

  const scrollToCheckout = () => {
    setCartDrawerOpen(false);
    if (checkoutRef.current) {
      checkoutRef.current.goToCheckout();
    } else {
      document.getElementById("checkout-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const openCart = () => setCartDrawerOpen(true);
  const openMobileCheckout = () => setMobileCheckoutOpen(true);

  const [isMobile, setIsMobile] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const { setSubNav } = useHeaderSubNav() ?? { setSubNav: () => {} };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => {
      setIsMobile(mq.matches);
      setIsDesktop(!mq.matches);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const handleCartClick = isMobile ? openMobileCheckout : openCart;
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
        const res = await fetch("/api/menu");
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
    if (!isDesktop) return;
    setSubNav(
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center min-w-0">
        <CategoryNav categories={categories} onScrollTo={scrollToSection} embeddedInHeader />
      </div>
    );
    return () => setSubNav(null);
  }, [isDesktop, categories, scrollToSection, setSubNav]);

  const orderingStatus = getOrderingStatus(settings);
  const canAcceptOrders = orderingStatus.canAccept;

  return (
    <div className="min-h-screen bg-cream text-charcoal flex flex-col overflow-x-clip">
      {!canAcceptOrders && orderingStatus.closedMessage && (
        <OrderingClosedBanner message={orderingStatus.closedMessage} />
      )}
      {/* Category nav — in header on desktop, here on mobile */}
      <nav
        className="lg:hidden w-full h-12 bg-teal-dark border-b-2 border-white/10 sticky top-16 z-[800] shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden -mt-2"
        aria-label="Menu categories"
      >
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center min-w-0">
          <CategoryNav categories={categories} onScrollTo={scrollToSection} />
        </div>
      </nav>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6 items-start">
          {/* LEFT: Menu — full width on mobile */}
          <div id="menu-section" className="lg:col-span-2 min-w-0">
            <MenuGrid
              categories={categories}
              loading={loading}
              hideCategoryNav
              sectionRefs={sectionRefs}
              orderingDisabled={!canAcceptOrders}
            />
          </div>

          {/* RIGHT: 3-step checkout flow — desktop only */}
          <div className="hidden lg:block lg:col-span-1">
            <CheckoutFlow
              checkoutRef={checkoutRef}
              onCartClick={openCart}
              onBackToMenu={() => document.getElementById("menu-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              orderingDisabled={!canAcceptOrders}
            />
          </div>
        </div>
      </div>

      {/* Mobile: full-screen step overlay */}
      <MobileCheckoutOverlay
        isOpen={mobileCheckoutOpen}
        onClose={() => setMobileCheckoutOpen(false)}
        onBackToMenu={() => {
          setMobileCheckoutOpen(false);
          document.getElementById("menu-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        orderingDisabled={!canAcceptOrders}
      />

      {/* Desktop: cart drawer */}
      <div className="hidden lg:block">
        <CartDrawer
          isOpen={cartDrawerOpen}
          onClose={() => setCartDrawerOpen(false)}
          onCheckoutClick={scrollToCheckout}
          orderingDisabled={!canAcceptOrders}
        />
      </div>

      {/* Mobile: Sticky "View Cart" bar when items exist */}
      {count > 0 && (
        <button
          type="button"
          onClick={openMobileCheckout}
          className="lg:hidden fixed left-0 right-0 bottom-14 z-[650] bg-cream-mid border-t-2 border-gold shadow-[0_-4px_20px_rgba(0,0,0,0.06)] w-full"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="max-w-[1140px] mx-auto px-5 py-4 flex justify-between items-center">
            <div className="text-left">
              <p className="font-semibold text-[11px] tracking-wider uppercase text-gray-mid">
                View Cart
              </p>
              <p className="font-display text-[20px] text-charcoal leading-none">
                {count} item{count !== 1 ? "s" : ""} · ${total.toFixed(2)}
              </p>
            </div>
            <span className="py-2.5 px-5 rounded-lg bg-red text-white font-semibold text-sm tracking-wider uppercase shadow-[0_3px_0_#800]">
              View →
            </span>
          </div>
        </button>
      )}

      {/* Spacer for mobile: bottom nav + sticky bar when items */}
      <div className={`lg:hidden ${count > 0 ? "h-36" : "h-20"}`} aria-hidden="true" />
    </div>
  );
}
