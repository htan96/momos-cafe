"use client";

import { forwardRef } from "react";
import { MenuCategory, MenuItem } from "@/types/menu";
import MenuItemCard from "./MenuItemCard";

interface MenuCategorySectionProps {
  category: MenuCategory;
  headerOffset?: number;
  orderingDisabled?: boolean;
  onAdd?: (item: MenuItem) => void;
  onCustomize?: (item: MenuItem) => void;
}

const MenuCategorySection = forwardRef<HTMLElement, MenuCategorySectionProps>(
  function MenuCategorySection(
    { category, headerOffset: _headerOffset = 64, orderingDisabled = false, onAdd, onCustomize },
    ref
  ) {
    const itemCount = category.menuitems?.length ?? 0;

    return (
      <section
        ref={ref}
        id={category.slug}
        className="mb-14 scroll-mt-[120px]"
      >
        <div className="flex flex-col gap-1 mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-dark">
            Menu
          </p>
          <div className="flex items-center gap-4">
            <h2 className="font-display text-2xl md:text-[clamp(26px,3.8vw,36px)] text-charcoal leading-tight">
              {category.name}
            </h2>
            <span className="flex-1 h-0.5 bg-gradient-to-r from-gold to-transparent max-md:hidden min-w-[32px]" />
            <span className="font-semibold text-[10px] tracking-[0.15em] uppercase text-teal whitespace-nowrap">
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-2.5 md:gap-4">
        {category.menuitems?.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            categorySlug={category.slug}
            hasModifiers={!!item.modifierGroups?.length}
            orderingDisabled={orderingDisabled}
            onAdd={onAdd}
            onCustomize={onCustomize}
          />
        ))}
      </div>
    </section>
    );
  }
);

export default MenuCategorySection;
