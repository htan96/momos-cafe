"use client";

import CommerceCategoryPill from "@/components/commerce/CommerceCategoryPill";
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
      <div className="container max-w-[1200px] mx-auto px-4 py-2.5">
        <div
          className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible scrollbar-none snap-x snap-mandatory"
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
        </div>
      </div>
    </div>
  );
}
