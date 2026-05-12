"use client";

import { forwardRef } from "react";
import { MenuCategory, MenuItem } from "@/types/menu";
import MenuItemCard from "./MenuItemCard";
import CommerceSectionHeader from "@/components/commerce/CommerceSectionHeader";
import { commerceMenuScrollMargin, commerceSectionSpacing } from "@/lib/commerce/tokens";

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
      <section ref={ref} id={category.slug} className={`${commerceSectionSpacing.sectionMb} ${commerceMenuScrollMargin}`}>
        <CommerceSectionHeader
          kicker="Menu"
          title={category.name}
          aside={
            <span className="font-semibold text-[10px] tracking-[0.22em] uppercase text-teal-dark whitespace-nowrap ml-auto md:ml-0">
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </span>
          }
        />

        <div className={`grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 ${commerceSectionSpacing.gap}`}>
          {category.menuitems?.map((item, idx) => (
            <MenuItemCard
              key={item.id}
              item={item}
              index={idx}
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
