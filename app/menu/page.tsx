"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MenuCategory } from "@/types/menu";
import { useCart, useCommerceCart } from "@/context/CartContext";
import { useAdminSettings, getOrderingStatus, DEFAULT_SETTINGS } from "@/lib/useAdminSettings";
import OrderingNoticeBanner from "@/components/menu/OrderingNoticeBanner";
import CategoryNav from "@/components/sections/menu/CategoryNav";
import MenuCategorySection from "@/components/sections/menu/MenuCategorySection";
import CartSidebar from "@/components/sections/menu/CartSidebar";
import MobileOrderBar from "@/components/sections/menu/MobileOrderBar";
import ModifierModal from "@/components/sections/menu/ModifierModal";
import MenuPickupContextStrip from "@/components/sections/menu/MenuPickupContextStrip";
import type { MenuItem } from "@/types/menu";
import type { SelectedModifier } from "@/types/ordering";
import { commerceCheckoutShell, commerceMenuScrollMargin, commerceSectionSpacing } from "@/lib/commerce/tokens";
import PageLoadBoundary, { type PageLoadPhase } from "@/components/ui/PageLoadBoundary";
import { fetchWithTimeout } from "@/lib/http/fetchWithTimeout";

export default function MenuPage() {
  const router = useRouter();
  const { settings } = useAdminSettings();
  const { addItem } = useCart();
  const { totalCount, grandTotal, setDrawerOpen } = useCommerceCart();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loadPhase, setLoadPhase] = useState<PageLoadPhase>("loading");
  const [modifierItem, setModifierItem] = useState<MenuItem | null>(null);
  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(null);

  const orderingDisabled = settings ? !settings.isOrderingOpen : false;

  const loadMenu = useCallback(async () => {
    setLoadPhase("loading");
    try {
      const res = await fetchWithTimeout("/api/menu", { cache: "no-store", timeoutMs: 22_000 });
      if (!res.ok) throw new Error("Failed to fetch menu");
      const data: unknown = await res.json();
      setCategories(Array.isArray(data) ? (data as MenuCategory[]) : []);
      setLoadPhase("ready");
    } catch (error) {
      console.error("Error fetching menu:", error);
      setCategories([]);
      setLoadPhase("error");
    }
  }, []);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  const addToCart = useCallback(
    (item: MenuItem, qty = 1, modifiers?: SelectedModifier[]) => {
      const base = item.price ?? 0;
      const savedForLater = !item.is_active;
      addItem({
        id: item.id,
        variationId: item.variationId ?? undefined,
        name: item.name,
        price: base,
        quantity: qty,
        modifiers,
        ...(savedForLater ? { savedForLater: true } : {}),
      });
    },
    [addItem]
  );

  const handleAddFromModal = useCallback(
    (item: MenuItem, qty: number, mods: SelectedModifier[]) => {
      const basePrice = item.price ?? 0;
      const savedForLater = !item.is_active;
      addItem({
        id: item.id,
        variationId: item.variationId ?? undefined,
        name: item.name,
        price: basePrice,
        quantity: qty,
        modifiers: mods.length > 0 ? mods : undefined,
        ...(savedForLater ? { savedForLater: true } : {}),
      });
      setModifierItem(null);
    },
    [addItem]
  );

  const effectiveCategorySlug =
    activeCategorySlug && categories.some((c) => c.slug === activeCategorySlug)
      ? activeCategorySlug
      : categories[0]?.slug ?? "";

  const activeCategory =
    effectiveCategorySlug ? categories.find((c) => c.slug === effectiveCategorySlug) : undefined;

  const selectMenuCategory = useCallback((slug: string) => {
    setActiveCategorySlug(slug);
    requestAnimationFrame(() => {
      document.getElementById("menu-catalog")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const orderingStatus = getOrderingStatus(settings ?? DEFAULT_SETTINGS);

  const menuSkeleton = (
    <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-sm rounded-2xl border border-cream-dark bg-white p-8 shadow-sm space-y-4">
        <div className="h-3 w-24 rounded-full bg-cream-dark/90 animate-pulse" />
        <div className="h-8 w-full rounded-lg bg-cream-dark/70 animate-pulse" />
        <div className="h-3 w-full rounded-full bg-cream-dark/55 animate-pulse" />
        <div className="h-3 w-4/5 rounded-full bg-cream-dark/45 animate-pulse" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-dark text-center pt-2">
          Loading menu
        </p>
      </div>
    </div>
  );

  return (
    <PageLoadBoundary
      phase={loadPhase}
      onRetry={() => void loadMenu()}
      errorMessage="We couldn’t load the menu."
      stallHintAfterMs={10_000}
      skeleton={menuSkeleton}
    >
    <div className={`${commerceCheckoutShell.page} overflow-x-clip pb-28 md:pb-16`}>
      {orderingStatus.scheduleNote ? (
        <OrderingNoticeBanner tone="schedule" message={orderingStatus.scheduleNote} />
      ) : null}

      <section aria-label="Menu introduction" className="pt-6 md:pt-10 pb-0">
        <div className="container max-w-[1200px] mx-auto px-4 md:px-5">
          <div
            className={`flex flex-col md:flex-row md:items-start md:justify-between ${commerceSectionSpacing.gap} mb-5 md:mb-6`}
          >
            <div>
              <p className={`${commerceCheckoutShell.sectionLabel} mb-1`}>Order pickup</p>
              <h1 className="font-display text-2xl md:text-[clamp(28px,4vw,40px)] text-charcoal leading-tight">
                Momo&apos;s kitchen menu
              </h1>
              <p className="text-[13px] md:text-[14px] text-charcoal/60 mt-3 max-w-xl leading-relaxed">
                Seasonal favorites from our kitchen, composed for pickup.
              </p>
            </div>
            <Link
              href="/shop"
              className="text-xs font-semibold uppercase tracking-wider text-teal-dark hover:text-charcoal shrink-0 transition-colors self-start md:self-auto"
            >
              Visit retail shop →
            </Link>
          </div>

          <MenuPickupContextStrip />
        </div>
      </section>

      {categories.length > 0 ? (
        <CategoryNav
          categories={categories}
          activeSlug={effectiveCategorySlug}
          onSelect={selectMenuCategory}
          stickyTopClass="top-[64px]"
        />
      ) : null}

      <div className="max-w-[1200px] mx-auto px-4 md:px-5 pb-32 lg:pb-10 grid grid-cols-1 lg:grid-cols-[1fr_minmax(300px,360px)] gap-8 lg:gap-10 items-start">
        <main className="min-w-0">
          {categories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-cream-dark bg-white py-16 text-center px-4">
              <p className="font-semibold text-charcoal">Nothing on the menu yet.</p>
              <p className="text-sm text-charcoal/55 mt-1">Check back soon — or say hello at the café.</p>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="mt-6 text-sm font-semibold text-teal-dark hover:underline underline-offset-2"
              >
                Back home
              </button>
            </div>
          ) : activeCategory ? (
            <div id="menu-catalog" className={commerceMenuScrollMargin}>
              <MenuCategorySection
                category={activeCategory}
                className="!mb-0"
                headerOffset={64}
                orderingDisabled={orderingDisabled}
                onAdd={(item) => addToCart(item, 1)}
                onCustomize={(item) => setModifierItem(item)}
              />
            </div>
          ) : null}
        </main>

        <CartSidebar headerOffset={64} orderingDisabled={orderingDisabled} />
      </div>

      {totalCount > 0 && (
        <MobileOrderBar
          itemCount={totalCount}
          total={grandTotal}
          onOpenCart={() => setDrawerOpen(true)}
          orderingDisabled={orderingDisabled}
        />
      )}

      <ModifierModal
        isOpen={!!modifierItem}
        onClose={() => setModifierItem(null)}
        item={modifierItem}
        orderingDisabled={orderingDisabled}
        onAddToOrder={handleAddFromModal}
      />

      <div className={`lg:hidden ${totalCount > 0 ? "h-28" : "h-16"}`} aria-hidden="true" />
    </div>
    </PageLoadBoundary>
  );
}
