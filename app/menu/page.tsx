"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MenuCategory, MenuItem } from "@/types/menu";
import { useAdminSettings, getOrderingStatus } from "@/lib/useAdminSettings";
import { useCart } from "@/context/CartContext";
import { useHeaderSubNav } from "@/context/HeaderSubNavContext";
import type { SelectedModifier } from "@/types/ordering";
import OrderingClosedBanner from "@/components/menu/OrderingClosedBanner";
import CategoryNav from "@/components/sections/menu/CategoryNav";
import MenuCategorySection from "@/components/sections/menu/MenuCategorySection";
import CartSidebar from "@/components/sections/menu/CartSidebar";
import CartDrawer from "@/components/sections/menu/CartDrawer";
import MobileOrderBar from "@/components/sections/menu/MobileOrderBar";
import ModifierModal from "@/components/sections/menu/ModifierModal";

export default function MenuPage() {
  const router = useRouter();
  const { settings } = useAdminSettings();
  const { items, total, count, addItem, updateQuantity } = useCart();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
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
      const price = item.price ?? 0;
      const modTotal = modifiers?.reduce((s, m) => s + m.price, 0) ?? 0;
      addItem({
        id: item.id,
        name: item.name,
        price: price + modTotal,
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
      const modTotal = mods.reduce((s, m) => s + m.price, 0);
      addItem({
        id: item.id,
        name: item.name,
        price: basePrice + modTotal,
        quantity: qty,
        modifiers: mods.length > 0 ? mods : undefined,
      });
      setModifierItem(null);
    },
    [addItem]
  );

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const { setSubNav } = useHeaderSubNav() ?? { setSubNav: () => {} };

  // Header (64px) + category bar (~56px) = ~120px
  const SCROLL_OFFSET = 120;

  const scrollToSection = useCallback((slug: string) => {
    const el = sectionRefs.current[slug];
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top: y, behavior: "smooth" });
  }, []);

  useEffect(() => {
    setSubNav(
      <CategoryNav
        categories={categories}
        onScrollTo={scrollToSection}
        embeddedInHeader
      />
    );
    return () => setSubNav(null);
  }, [categories, scrollToSection, setSubNav]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-mid text-teal">
        <p className="font-semibold">Loading menu...</p>
      </div>
    );
  }

  const orderingStatus = getOrderingStatus(settings);
  const canAcceptOrders = orderingStatus.canAccept;

  return (
    <div className="min-h-screen bg-cream-mid text-charcoal overflow-x-clip">
      {!canAcceptOrders && orderingStatus.closedMessage && (
        <OrderingClosedBanner message={orderingStatus.closedMessage} />
      )}
      <div className="max-w-[1200px] mx-auto px-5 py-8 pb-32 lg:pb-8 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
        <main className="min-w-0">
          {categories.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-mid mb-4">No menu items yet.</p>
              <Link
                href="/"
                className="text-teal font-semibold hover:underline"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            categories.map((category) => (
              <MenuCategorySection
                key={category.id}
                ref={(el) => { sectionRefs.current[category.slug] = el; }}
                category={category}
                headerOffset={64}
                orderingDisabled={!canAcceptOrders}
                onAdd={(item) => addToCart(item, 1)}
                onCustomize={(item) => setModifierItem(item)}
              />
            ))
          )}
        </main>

        <CartSidebar
          items={items}
          total={total}
          headerOffset={64}
          onQtyChange={handleQtyChange}
          onPlaceOrder={() => router.push("/order")}
          orderingDisabled={!canAcceptOrders}
        />
      </div>

      {/* Mobile order bar - shown when cart has items, hidden on desktop */}
      {count > 0 && (
        <MobileOrderBar
          itemCount={count}
          total={total}
          onOpenCart={() => setCartDrawerOpen(true)}
          orderingDisabled={!canAcceptOrders}
        />
      )}

      {/* Cart drawer (mobile) */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        items={items}
        total={total}
        onQtyChange={handleQtyChange}
        onPlaceOrder={() => {
          setCartDrawerOpen(false);
          router.push("/order");
        }}
        orderingDisabled={!canAcceptOrders}
      />

      {/* Modifier modal - opens when Customize is clicked */}
      <ModifierModal
        isOpen={!!modifierItem}
        onClose={() => setModifierItem(null)}
        item={modifierItem}
        orderingDisabled={!canAcceptOrders}
        onAddToOrder={handleAddFromModal}
      />
    </div>
  );
}
