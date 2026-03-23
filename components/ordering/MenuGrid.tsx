"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { MenuCategory, MenuItem } from "@/types/menu";
import type { ModifierGroup } from "@/types/ordering";
import ProductCard from "./ProductCard";
import ItemModal from "./ItemModal";
import CategoryNav from "./CategoryNav";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";

interface MenuGridProps {
  /** When provided, use these instead of fetching */
  categories?: MenuCategory[];
  /** When true, use this instead of internal loading state */
  loading?: boolean;
  /** When true, do not render CategoryNav (parent renders it) */
  hideCategoryNav?: boolean;
  /** Ref object for section elements (parent controls scroll) */
  sectionRefs?: React.MutableRefObject<Record<string, HTMLElement | null>>;
  /** When true, disable add/customize buttons */
  orderingDisabled?: boolean;
}

export default function MenuGrid({
  categories: categoriesProp,
  loading: loadingProp,
  hideCategoryNav,
  sectionRefs: sectionRefsProp,
  orderingDisabled = false,
}: MenuGridProps = {}) {
  const [categoriesState, setCategoriesState] = useState<MenuCategory[]>([]);
  const [loadingState, setLoadingState] = useState(!categoriesProp);
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [modalGroups, setModalGroups] = useState<ModifierGroup[]>([]);
  const { addItem } = useCart();
  const showToast = useToast();
  const internalRefs = useRef<Record<string, HTMLElement | null>>({});

  const categories = categoriesProp ?? categoriesState;
  const loading = loadingProp ?? loadingState;
  const sectionRefs = sectionRefsProp ?? internalRefs;

  const SCROLL_OFFSET = 120; // header + category nav

  const scrollToSection = useCallback((slug: string) => {
    const el = sectionRefs.current[slug];
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top: y, behavior: "smooth" });
  }, [sectionRefs]);

  // Fetch only when not controlled by parent
  useEffect(() => {
    if (categoriesProp) return;
    let cancelled = false;
    fetch("/api/menu", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => !cancelled && setCategoriesState(data || []))
      .catch(() => !cancelled && setCategoriesState([]))
      .finally(() => !cancelled && setLoadingState(false));
    return () => { cancelled = true; };
  }, [categoriesProp]);

  const getModifierGroups = (item: MenuItem): ModifierGroup[] | undefined => {
    return item.modifierGroups?.length ? item.modifierGroups : undefined;
  };

  const handleAdd = (item: MenuItem) => {
    if (orderingDisabled) return;
    const price = item.price ?? 0;
    addItem({
      id: item.id,
      name: item.name,
      price,
      quantity: 1,
    });
    showToast(`${item.name} added!`);
  };

  const handleCustomize = (item: MenuItem, groups: ModifierGroup[]) => {
    if (orderingDisabled) return;
    setModalItem(item);
    setModalGroups(groups);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <p className="font-semibold text-teal">Loading menu...</p>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-mid mb-4">No menu items yet.</p>
      </div>
    );
  }

  return (
    <>
      {!hideCategoryNav && (
        <CategoryNav categories={categories} onScrollTo={scrollToSection} />
      )}
      {categories.map((category) => {
        const groups = category.menuitems?.length ?? 0;
        const type = category.type ?? "main";
        const isFeatured = type === "featured";
        const isDrinks = type === "drinks";
        const cardVariant = isDrinks || type === "sides" ? "compact" : "default";
        const gridCols = isDrinks
          ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
          : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";

        return (
          <section
            key={category.id}
            ref={(el) => { sectionRefs.current[category.slug] = el as HTMLElement | null; }}
            id={category.slug}
            className={`mb-11 scroll-mt-[120px] ${
              isFeatured ? "rounded-2xl border-2 border-gold/40 bg-gradient-to-b from-cream to-white p-6 shadow-[0_4px_20px_rgba(193,154,53,0.12)]" : ""
            }`}
          >
            <div className="flex items-center gap-4 mb-4">
              <h2 className="font-display text-[32px] text-charcoal leading-none">
                {category.name}
              </h2>
              <span className="flex-1 h-0.5 bg-gradient-to-r from-gold to-transparent" />
              <span className="font-semibold text-[11px] tracking-[0.15em] uppercase text-teal whitespace-nowrap">
                {groups} item{groups !== 1 ? "s" : ""}
              </span>
            </div>

            <div className={`grid ${gridCols} gap-4`}>
              {category.menuitems?.map((item) => {
                const modGroups = getModifierGroups(item);
                return (
                  <ProductCard
                    key={item.id}
                    item={item}
                    modifierGroups={modGroups}
                    onAdd={handleAdd}
                    onCustomize={handleCustomize}
                    variant={cardVariant}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      <ItemModal
        isOpen={!!modalItem}
        onClose={() => setModalItem(null)}
        item={modalItem}
        modifierGroups={modalGroups}
        orderingDisabled={orderingDisabled}
        onAdded={modalItem ? () => showToast(`${modalItem.name} added!`) : undefined}
      />
    </>
  );
}
