"use client";

import { forwardRef } from "react";
import { MenuCategory, MenuItem } from "@/types/menu";
import MenuItemCard from "./MenuItemCard";
import CommerceSectionHeader from "@/components/commerce/CommerceSectionHeader";

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
      <section ref={ref} id={category.slug} className="mb-14 scroll-mt-[120px]">
        <CommerceSectionHeader
          kicker="Menu"
          title={category.name}
          aside={
            <span className="font-semibold text-[10px] tracking-[0.15em] uppercase text-teal whitespace-nowrap ml-auto md:ml-0">
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </span>
          }
        />

        <div className={`grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-2.5 md:gap-4`}>
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
