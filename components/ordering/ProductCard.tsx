"use client";

import Image from "next/image";
import type { MenuItem } from "@/types/menu";
import type { ModifierGroup } from "@/types/ordering";

interface ProductCardProps {
  item: MenuItem;
  modifierGroups?: ModifierGroup[];
  onAdd: (item: MenuItem) => void;
  onCustomize: (item: MenuItem, groups: ModifierGroup[]) => void;
  /** Compact layout for drinks/sides; standard for main/breakfast/lunch */
  variant?: "default" | "compact";
  orderingDisabled?: boolean;
}

export default function ProductCard({
  item,
  modifierGroups,
  onAdd,
  onCustomize,
  variant = "default",
  orderingDisabled = false,
}: ProductCardProps) {
  const hasModifiers = modifierGroups && modifierGroups.length > 0;
  const price = item.price ?? 0;

  const handleClick = () => {
    if (orderingDisabled) return;
    if (hasModifiers) {
      onCustomize(item, modifierGroups);
    } else {
      onAdd(item);
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (orderingDisabled) return;
    if (hasModifiers) {
      onCustomize(item, modifierGroups);
    } else {
      onAdd(item);
    }
  };

  const isCompact = variant === "compact";

  return (
    <article
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${item.name}${hasModifiers ? " — customize" : ""}`}
      className={`bg-white border-[1.5px] border-cream-dark rounded-2xl overflow-hidden flex flex-col transition-all ${
        orderingDisabled
          ? "cursor-default opacity-90"
          : "cursor-pointer hover:border-teal-light hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] hover:-translate-y-0.5"
      }`}
    >
      <div
        className={`w-full bg-cream-dark flex items-center justify-center overflow-hidden ${
          isCompact ? "h-[80px] text-3xl" : "h-[140px] text-5xl"
        }`}
      >
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            width={isCompact ? 160 : 280}
            height={isCompact ? 80 : 140}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="opacity-70">{isCompact ? "🥤" : "🍽️"}</span>
        )}
      </div>

      <div className={`flex-1 flex flex-col ${isCompact ? "p-3" : "p-4"}`}>
        <h3
          className={`font-semibold text-charcoal leading-tight ${
            isCompact ? "text-[13px] mb-0.5" : "text-[15px] mb-1"
          }`}
        >
          {item.name}
        </h3>
        <p
          className={`text-gray-mid leading-snug flex-1 ${
            isCompact ? "text-[11px] line-clamp-1 mb-2" : "text-xs line-clamp-2 mb-3"
          }`}
          title={item.description ?? undefined}
        >
          {item.description || "Description coming soon."}
        </p>

        <div className={`flex items-center justify-between gap-2 ${isCompact ? "gap-1.5" : ""}`}>
          <div>
            <span
              className={`font-display text-red leading-none ${
                isCompact ? "text-lg" : "text-2xl"
              }`}
            >
              {price > 0 ? `$${price}` : "--"}
            </span>
            {hasModifiers && (
              <span className="font-semibold text-[10px] text-teal tracking-wider uppercase block mt-0.5">
                customize
              </span>
            )}
          </div>

          {hasModifiers ? (
            <button
              type="button"
              onClick={handleAddClick}
              disabled={orderingDisabled}
              className={`flex items-center gap-1.5 rounded-lg font-semibold tracking-wider uppercase transition-all ${
                orderingDisabled
                  ? "border-cream-dark text-gray-mid bg-cream cursor-not-allowed px-3.5 py-2 text-[11px]"
                  : `border-[1.5px] border-teal text-teal-dark hover:bg-teal hover:text-white ${isCompact ? "px-2 py-1.5 text-[10px]" : "px-3 py-2 text-[11px]"}`
              }`}
              aria-label={orderingDisabled ? "Ordering closed" : `Customize ${item.name}`}
            >
              {orderingDisabled ? "Ordering Closed" : <>Customize <span className="text-[10px]">▸</span></>}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAddClick}
              disabled={orderingDisabled}
              className={`rounded-lg flex items-center justify-center leading-none transition-all ${
                orderingDisabled
                  ? "bg-gray-mid text-white/80 cursor-not-allowed shadow-none"
                  : "bg-red text-white shadow-[0_3px_0_#800] hover:opacity-90 hover:-translate-y-0.5"
              } ${isCompact ? "w-8 h-8 text-lg" : "w-9 h-9 text-xl"}`}
              aria-label={orderingDisabled ? "Ordering closed" : `Add ${item.name}`}
            >
              {orderingDisabled ? "Closed" : "+"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
