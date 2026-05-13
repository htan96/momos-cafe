"use client";

import Image from "next/image";
import type { MenuItem } from "@/types/menu";
import CommerceProductCardShell from "@/components/commerce/CommerceProductCardShell";
import CommerceBadge from "@/components/commerce/CommerceBadge";
import { formatMoney } from "@/lib/commerce/fulfillmentPreview";

interface MenuItemCardProps {
  item: MenuItem;
  categorySlug: string;
  hasModifiers?: boolean;
  orderingDisabled?: boolean;
  onAdd?: (item: MenuItem) => void;
  onCustomize?: (item: MenuItem) => void;
  index?: number;
}

export default function MenuItemCard({
  item,
  categorySlug: _categorySlug,
  hasModifiers = false,
  orderingDisabled: _orderingDisabled = false,
  onAdd,
  onCustomize,
  index = 0,
}: MenuItemCardProps) {
  /** Subtle menu-only cue — no “paused / unavailable” language. */
  const lineQuiet = !item.is_active;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasModifiers) {
      onCustomize?.(item);
    } else {
      onAdd?.(item);
    }
  };

  const handleCardClick = () => {
    if (hasModifiers) {
      onCustomize?.(item);
    } else {
      onAdd?.(item);
    }
  };

  const primaryLabel = hasModifiers ? "Options" : "Add";

  const imageSlot = (
    <>
      {item.image_url ? (
        <Image
          src={item.image_url}
          alt={item.name}
          fill
          className={`object-cover transition-transform duration-300 group-hover:scale-[1.03] ${lineQuiet ? "brightness-[0.97]" : ""}`}
          sizes="(max-width: 768px) 45vw, 280px"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-teal-dark via-teal to-cream-mid text-white/25">
          <span className="font-display text-3xl md:text-4xl select-none tracking-tight">M</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/35 mt-1">Momo&apos;s</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-charcoal/50 to-transparent opacity-70 transition-opacity group-hover:opacity-90" />

      {hasModifiers ? (
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <CommerceBadge tone="tealOutline">Customizable</CommerceBadge>
        </div>
      ) : null}

      {lineQuiet ? (
        <div
          className="pointer-events-none absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-teal-dark/35 ring-2 ring-white/80"
          aria-hidden
        />
      ) : null}

      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 pointer-events-none">
        <span className="rounded-full bg-white/92 backdrop-blur-sm px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-teal-dark shadow-sm ring-1 ring-white/60">
          Same-day pickup
        </span>
      </div>
    </>
  );

  const footerSlot = (
    <div className="flex items-end justify-between gap-2 pt-1 border-t border-cream-dark/60">
      <div className="min-w-0">
        <span className="font-display text-lg md:text-xl text-red leading-none">
          {item.price != null ? formatMoney(item.price) : "—"}
        </span>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="shrink-0 rounded-lg bg-charcoal px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-cream shadow-[0_2px_0_#111] transition-all hover:bg-teal-dark hover:shadow-[0_2px_0_#1a4a4a] active:translate-y-px"
        aria-label={hasModifiers ? "Customize item" : "Add item"}
      >
        {primaryLabel}
      </button>
    </div>
  );

  return (
    <CommerceProductCardShell
      idAttr={`item-${item.id}`}
      onCardClick={handleCardClick}
      imageSlot={imageSlot}
      footerSlot={footerSlot}
      cardStyle={{
        animationDelay: `${Math.min(index, 12) * 35}ms`,
      }}
    >
      <h3 className="font-semibold text-[13px] md:text-sm leading-snug text-charcoal line-clamp-2 min-h-[2.35rem]">
        {item.name}
      </h3>
      <p
        className="text-[11px] md:text-[12px] text-charcoal/55 leading-snug line-clamp-2 flex-1"
        title={item.description ?? undefined}
      >
        {item.description?.trim() || "Made fresh — tastes best shared."}
      </p>
    </CommerceProductCardShell>
  );
}
