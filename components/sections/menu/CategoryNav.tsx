"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { MenuCategory } from "@/types/menu";
import CommerceCategoryPill from "@/components/commerce/CommerceCategoryPill";
import { commerceCategoryStripShell } from "@/lib/commerce/tokens";

const STICKY_OFFSET = 140;

interface CategoryNavProps {
  categories: MenuCategory[];
  headerOffset?: number;
  onScrollTo?: (slug: string) => void;
  /** Rendered inside site header — outer chrome is provided by `Header`. */
  embeddedInHeader?: boolean;
}

export default function CategoryNav({
  categories,
  onScrollTo,
  embeddedInHeader = false,
}: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>(categories[0]?.slug ?? "");

  useEffect(() => {
    if (categories.length === 0) return;

    const updateActive = () => {
      let best: string | null = null;
      let bestTop = -Infinity;
      for (const cat of categories) {
        const el = document.getElementById(cat.slug);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= STICKY_OFFSET + 80 && top > bestTop) {
          bestTop = top;
          best = cat.slug;
        }
      }
      if (!best && categories.length > 0) {
        let closest = categories[0].slug;
        let closestDist = Infinity;
        for (const cat of categories) {
          const el = document.getElementById(cat.slug);
          if (!el) continue;
          const top = el.getBoundingClientRect().top;
          const dist = Math.abs(top - STICKY_OFFSET);
          if (dist < closestDist) {
            closestDist = dist;
            closest = cat.slug;
          }
        }
        best = closest;
      }
      if (best) setActiveId(best);
    };

    updateActive();
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        updateActive();
        raf = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [categories]);

  useEffect(() => {
    if (!activeId) return;
    const btn = scrollRef.current?.querySelector(`[data-slug="${activeId}"]`) as HTMLElement | null;
    const container = scrollRef.current;
    if (btn && container) {
      const scrollLeft = btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2;
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: "smooth" });
    }
  }, [activeId]);

  const scrollTo = useCallback(
    (slug: string) => {
      onScrollTo?.(slug);
      setActiveId(slug);
      const btn = scrollRef.current?.querySelector(`[data-slug="${slug}"]`) as HTMLElement | null;
      const container = scrollRef.current;
      if (btn && container) {
        const scrollLeft = btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2;
        container.scrollTo({ left: Math.max(0, scrollLeft), behavior: "smooth" });
      }
    },
    [onScrollTo]
  );

  if (categories.length === 0) return null;

  const outerClass = embeddedInHeader
    ? "w-full"
    : `sticky top-[116px] md:top-[118px] z-30 ${commerceCategoryStripShell}`;

  return (
    <nav id="cat-nav" className={outerClass} aria-label="Menu categories">
      <div className="container max-w-[1200px] mx-auto px-4 py-2.5">
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible scrollbar-none snap-x snap-mandatory min-h-[40px] items-center"
          role="tablist"
          aria-label="Menu categories"
        >
          {categories.map((cat) => {
            const active = activeId === cat.slug;
            return (
              <CommerceCategoryPill
                key={cat.slug}
                id={`cat-${cat.slug}`}
                role="tab"
                aria-selected={active}
                dataSlug={cat.slug}
                label={cat.name}
                active={active}
                onClick={() => scrollTo(cat.slug)}
              />
            );
          })}
        </div>
      </div>
    </nav>
  );
}
