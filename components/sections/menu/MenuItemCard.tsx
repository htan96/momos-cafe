"use client";

import Image from "next/image";
import { MenuItem } from "@/types/menu";

interface MenuItemCardProps {
  item: MenuItem;
  categorySlug: string;
  hasModifiers?: boolean;
  orderingDisabled?: boolean;
  onAdd?: (item: MenuItem) => void;
  onCustomize?: (item: MenuItem) => void;
}

export default function MenuItemCard({
  item,
  categorySlug,
  hasModifiers = false,
  orderingDisabled = false,
  onAdd,
  onCustomize,
}: MenuItemCardProps) {
  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (orderingDisabled) return;
    if (hasModifiers) {
      onCustomize?.(item);
    } else {
      onAdd?.(item);
    }
  };

  const handleCardClick = () => {
    if (orderingDisabled) return;
    if (hasModifiers) {
      onCustomize?.(item);
    } else {
      onAdd?.(item);
    }
  };

  return (
    <div
      id={`item-${item.id}`}
      onClick={handleCardClick}
      className={`bg-white border-[1.5px] border-cream-dark rounded-2xl overflow-hidden flex flex-col transition-all duration-200 ${
        orderingDisabled
          ? "cursor-default opacity-90"
          : "cursor-pointer hover:border-teal-light hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] hover:-translate-y-0.5"
      }`}
    >
      {/* Image area */}
      <div className="w-full h-[150px] bg-cream-dark flex items-center justify-center text-5xl overflow-hidden">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            width={280}
            height={150}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="opacity-70">🍽️</span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-base text-charcoal mb-1 leading-tight">
          {item.name}
        </h3>
        <p
          className="text-[12.5px] text-gray-mid leading-snug mb-3 flex-1 line-clamp-2"
          title={item.description ?? undefined}
        >
          {item.description || "Description coming soon."}
        </p>

        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="font-display text-[26px] text-red leading-none">
              {item.price != null ? `$${item.price}` : "--"}
            </span>
            {hasModifiers && (
              <small className="font-semibold text-[11px] text-teal tracking-wider uppercase block mt-0.5">
                customize
              </small>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={orderingDisabled}
            className={`flex items-center justify-center rounded-lg font-semibold transition-all duration-150 flex-shrink-0 ${
              orderingDisabled
                ? "bg-gray-mid text-white/80 cursor-not-allowed shadow-none"
                : hasModifiers
                  ? "bg-red px-3.5 py-2 text-xs tracking-wider gap-1.5 text-white shadow-[0_3px_0_#800] hover:-translate-y-0.5"
                  : "w-9 h-9 bg-red text-white text-xl shadow-[0_3px_0_#800] hover:-translate-y-0.5"
            }`}
          >
            {orderingDisabled ? "Ordering Closed" : hasModifiers ? "Customize +" : "+"}
          </button>
        </div>
      </div>
    </div>
  );
}
