"use client";

import Image from "next/image";
import { MenuItem } from "@/types/menu";
import CommerceProductCardShell from "@/components/commerce/CommerceProductCardShell";
import CommerceBadge from "@/components/commerce/CommerceBadge";

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
  categorySlug: _categorySlug,
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

  const imageSlot = (
    <>
      {item.image_url ? (
        <Image
          src={item.image_url}
          alt={item.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 100vw, 360px"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-teal-dark/90 to-charcoal text-white/30">
          <span className="font-display text-4xl md:text-5xl">M</span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.35em] text-white/35 mt-1">plate</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-charcoal/45 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
      {!orderingDisabled && hasModifiers && (
        <span className="absolute left-2 top-2">
          <CommerceBadge tone="tealOutline">Customizable</CommerceBadge>
        </span>
      )}
    </>
  );

  const footerSlot = (
    <div className="flex items-end justify-between gap-2 pt-2 border-t border-cream-dark/60">
      <div className="min-w-0">
        <span className="font-display text-xl md:text-2xl text-red leading-none tracking-tight">
          {item.price != null ? `$${item.price.toFixed(2)}` : "--"}
        </span>
        {hasModifiers && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-dark mt-0.5">Customize</p>
        )}
      </div>
      <button
        onClick={handleAdd}
        disabled={orderingDisabled}
        className={`shrink-0 rounded-lg font-bold uppercase tracking-wide transition-all ${
          orderingDisabled
            ? "bg-gray-mid text-white/80 px-3 py-2 text-[10px] cursor-not-allowed shadow-none"
            : hasModifiers
              ? "bg-charcoal text-cream px-3 py-2 text-[10px] shadow-[0_2px_0_#111] hover:bg-teal-dark active:translate-y-px"
              : "w-9 h-9 flex items-center justify-center bg-charcoal text-cream text-lg leading-none shadow-[0_2px_0_#111] hover:bg-teal-dark active:translate-y-px rounded-lg"
        }`}
        aria-label={hasModifiers ? "Customize item" : "Add item"}
      >
        {orderingDisabled ? "Closed" : hasModifiers ? "Build" : "+"}
      </button>
    </div>
  );

  return (
    <CommerceProductCardShell
      idAttr={`item-${item.id}`}
      orderingDisabled={orderingDisabled}
      onCardClick={orderingDisabled ? undefined : handleCardClick}
      imageSlot={imageSlot}
      footerSlot={footerSlot}
    >
      <h3 className="font-semibold text-[13px] md:text-sm text-charcoal leading-snug line-clamp-2 min-h-[2.35rem]">
        {item.name}
      </h3>
      <p
        className="text-[11px] md:text-[12px] text-charcoal/55 leading-snug line-clamp-2 flex-1"
        title={item.description ?? undefined}
      >
        {item.description || "Chef’s plating — tastes even better here."}
      </p>
    </CommerceProductCardShell>
  );
}
