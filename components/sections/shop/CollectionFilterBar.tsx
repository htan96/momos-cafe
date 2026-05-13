"use client";

import CommerceCategoryPill from "@/components/commerce/CommerceCategoryPill";
import CommerceCategoryScrollRail from "@/components/commerce/CommerceCategoryScrollRail";
import { commerceCategoryStripShell } from "@/lib/commerce/tokens";

import type { MerchStoreCollection } from "@/types/merchCatalog";
import type { MerchFilterId } from "@/lib/merch/merchProductCollectionMatch";

interface CollectionFilterBarProps {
  /** Top-level Strip categories (typically Store-root children). */
  filterCollections: MerchStoreCollection[];
  activeId: MerchFilterId;
  onSelect: (id: MerchFilterId) => void;
}

export default function CollectionFilterBar({
  filterCollections,
  activeId,
  onSelect,
}: CollectionFilterBarProps) {
  const chips: { id: MerchFilterId; label: string }[] = [
    { id: "all", label: "All" },
    ...filterCollections.map((c) => ({ id: c.slug as MerchFilterId, label: c.title })),
  ];

  return (
    <div
      className={`sticky top-[52px] md:top-[64px] z-30 ${commerceCategoryStripShell}`}
    >
      <div className="container max-w-[1200px] mx-auto px-5 sm:px-6 py-2.5">
        <CommerceCategoryScrollRail
          scrollClassName="flex gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] md:flex-wrap md:overflow-visible scrollbar-none snap-x snap-mandatory min-h-[40px] items-center"
          role="tablist"
          aria-label="Filter by category"
        >
          {chips.map((chip) => {
            const active = activeId === chip.id;
            return (
              <CommerceCategoryPill
                key={chip.id}
                role="tab"
                aria-selected={active}
                label={chip.label}
                active={active}
                onClick={() => onSelect(chip.id)}
              />
            );
          })}
        </CommerceCategoryScrollRail>
      </div>
    </div>
  );
}
