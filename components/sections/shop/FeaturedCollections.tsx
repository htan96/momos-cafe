"use client";

import type { MerchStoreCollection } from "@/types/merchCatalog";
import type { MerchFilterId } from "@/lib/merch/merchProductCollectionMatch";

const ACCENTS: Record<string, string> = {
  teal: "from-teal/90 to-teal-dark ring-teal/20",
  gold: "from-gold to-amber-800 ring-gold/35",
  red: "from-red to-red/85 ring-red/25",
  charcoal: "from-charcoal to-charcoal/90 ring-charcoal/30",
};

interface FeaturedCollectionsProps {
  featuredCollections: MerchStoreCollection[];
  activeId: MerchFilterId;
  onSelect: (id: MerchFilterId) => void;
}

export default function FeaturedCollections({
  featuredCollections,
  activeId,
  onSelect,
}: FeaturedCollectionsProps) {
  if (featuredCollections.length === 0) return null;

  return (
    <section
      id="shop-collections"
      aria-label="Featured collections"
      className="py-8 md:py-10 bg-white border-b border-cream-dark/60 scroll-mt-[76px]"
    >
      <div className="container max-w-[1200px] mx-auto px-4">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-dark mb-1">
              Explore
            </p>
            <h2 className="font-display text-2xl md:text-3xl text-charcoal leading-tight">
              Featured collections
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onSelect("all")}
            className={`text-xs font-semibold uppercase tracking-wider shrink-0 transition-colors ${
              activeId === "all" ? "text-red" : "text-charcoal/50 hover:text-teal-dark"
            }`}
          >
            View all
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin -mx-1 px-1 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-4 md:overflow-visible md:pb-0">
          {featuredCollections.map((c) => {
            const selected = activeId === c.slug;
            const grad = ACCENTS[c.accent] ?? ACCENTS.teal;
            const goldish = c.accent === "gold";
            const titleCls = goldish ? "text-charcoal" : "text-white";
            const subCls = goldish ? "text-charcoal/70" : "text-white/85";
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => onSelect(c.slug)}
                className={`snap-start shrink-0 w-[min(78vw,280px)] md:w-auto text-left rounded-2xl p-[1px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 ${
                  selected ? "ring-2 ring-red ring-offset-2 ring-offset-cream" : "hover:opacity-95"
                }`}
              >
                <div
                  className={`rounded-2xl h-[120px] md:h-[140px] px-5 py-4 flex flex-col justify-end bg-gradient-to-br ${grad} ring-1 ring-inset shadow-[0_4px_0_rgba(0,0,0,0.12)]`}
                >
                  <span className={`font-display text-xl md:text-2xl leading-tight drop-shadow-sm ${titleCls}`}>
                    {c.title}
                  </span>
                  <span className={`text-[11px] md:text-xs mt-1 font-medium ${subCls}`}>{c.tagline}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
