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
    { category, headerOffset = 64, orderingDisabled = false, onAdd, onCustomize },
    ref
  ) {
    const itemCount = category.menuitems?.length ?? 0;

    return (
      <section
        ref={ref}
        id={category.slug}
        className="mb-12 scroll-mt-[120px]"
    >
      <div className="flex items-center gap-4 mb-5">
        <h2 className="font-display text-[34px] text-charcoal leading-none">
          {category.name}
        </h2>
        <span className="flex-1 h-0.5 bg-gradient-to-r from-gold to-transparent" />
        <span className="font-semibold text-[11px] tracking-[0.15em] uppercase text-teal whitespace-nowrap">
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
