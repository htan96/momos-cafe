"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { MenuCategory } from "@/types/menu";
import { useCart, useCommerceCart } from "@/context/CartContext";
import { useCartNav } from "@/context/CartNavContext";
import { useHeaderSubNav } from "@/context/HeaderSubNavContext";
import { useAdminSettings, getOrderingStatus } from "@/lib/useAdminSettings";
import OrderingClosedBanner from "@/components/menu/OrderingClosedBanner";
import CategoryNav from "@/components/sections/menu/CategoryNav";
import MenuCategorySection from "@/components/sections/menu/MenuCategorySection";
import CartSidebar from "@/components/sections/menu/CartSidebar";
import MobileOrderBar from "@/components/sections/menu/MobileOrderBar";
import ModifierModal from "@/components/sections/menu/ModifierModal";
import type { MenuItem } from "@/types/menu";
import type { SelectedModifier } from "@/types/ordering";

export default function MenuPage() {
  const router = useRouter();
  const { settings } = useAdminSettings();
  const { addItem, updateQuantity } = useCart();
  const { totalCount, grandTotal, setDrawerOpen } = useCommerceCart();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modifierItem, setModifierItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    async function loadMenu() {
      try {
        const res = await fetch("/api/menu", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch menu");
        const data = await res.json();
        setCategories(data || []);
      } catch (error) {
        console.error("Error fetching menu:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, []);

  const addToCart = useCallback(
    (item: MenuItem, qty = 1, modifiers?: SelectedModifier[]) => {
      const base = item.price ?? 0;
      addItem({
        id: item.id,
        variationId: item.variationId ?? undefined,
        name: item.name,
        price: base,
        quantity: qty,
        modifiers,
      });
    },
    [addItem]
  );

  const handleQtyChange = useCallback(
    (index: number, delta: number) => {
      updateQuantity(index, delta);
    },
    [updateQuantity]
  );

  const handleAddFromModal = useCallback(
    (item: MenuItem, qty: number, mods: SelectedModifier[]) => {
      const basePrice = item.price ?? 0;
      addItem({
        id: item.id,
        variationId: item.variationId ?? undefined,
        name: item.name,
        price: basePrice,
        quantity: qty,
        modifiers: mods.length > 0 ? mods : undefined,
      });
      setModifierItem(null);
    },
    [addItem]
  );

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const { setSubNav } = useHeaderSubNav() ?? { setSubNav: () => {} };

  const SCROLL_OFFSET = 120;

  const scrollToSection = useCallback((slug: string) => {
    const el = sectionRefs.current[slug];
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top: y, behavior: "smooth" });
  }, []);

  useEffect(() => {
    setSubNav(
      <CategoryNav categories={categories} onScrollTo={scrollToSection} embeddedInHeader />
    );
    return () => setSubNav(null);
  }, [categories, scrollToSection, setSubNav]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream text-teal-dark">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em]">Loading</p>
      </div>
    );
  }

  const orderingStatus = getOrderingStatus(settings);
  const canAcceptOrders = orderingStatus.canAccept;

  return (
    <div className="min-h-screen bg-cream text-charcoal overflow-x-clip">
      {!canAcceptOrders && orderingStatus.closedMessage && (
        <OrderingClosedBanner message={orderingStatus.closedMessage} />
      )}
      <div className="max-w-[1200px] mx-auto px-4 md:px-5 py-8 pb-32 lg:pb-8 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 lg:gap-10 items-start">
        <main className="min-w-0">
          {categories.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-mid mb-4">No menu items yet.</p>
              <button type="button" onClick={() => router.push("/")} className="text-teal font-semibold hover:underline">
                Back to Home
              </button>
            </div>
          ) : (
            categories.map((category) => (
              <MenuCategorySection
                key={category.id}
                ref={(el) => {
                  sectionRefs.current[category.slug] = el;
                }}
                category={category}
                headerOffset={64}
                orderingDisabled={!canAcceptOrders}
                onAdd={(item) => addToCart(item, 1)}
                onCustomize={(item) => setModifierItem(item)}
              />
            ))
          )}
        </main>

        <CartSidebar headerOffset={64} orderingDisabled={!canAcceptOrders} />
      </div>

      {totalCount > 0 && (
        <MobileOrderBar
          itemCount={totalCount}
          total={grandTotal}
          onOpenCart={() => setDrawerOpen(true)}
          orderingDisabled={!canAcceptOrders}
        />
      )}

      <ModifierModal
        isOpen={!!modifierItem}
        onClose={() => setModifierItem(null)}
        item={modifierItem}
        orderingDisabled={!canAcceptOrders}
        onAddToOrder={handleAddFromModal}
      />

      {/* Spacer bottom nav */}
      <div className={`lg:hidden ${totalCount > 0 ? "h-28" : "h-16"}`} aria-hidden="true" />
    </div>
  );
}
