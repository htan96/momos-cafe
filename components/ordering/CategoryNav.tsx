"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { MenuCategory } from "@/types/menu";

const STICKY_OFFSET = 140; // header + category nav height

interface CategoryNavProps {
  categories: MenuCategory[];
  onScrollTo?: (slug: string) => void;
  embeddedInHeader?: boolean;
}

export default function CategoryNav({ categories, onScrollTo, embeddedInHeader = false }: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>(categories[0]?.slug ?? "");

  // Scroll listener: update active category based on which section is at the top
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

  const scrollTo = useCallback(
    (slug: string) => {
      onScrollTo?.(slug);
      setActiveId(slug);
      // Scroll the category bar horizontally only — do NOT use scrollIntoView on the button,
      // as it can scroll the document and override our page scroll.
      const btn = scrollRef.current?.querySelector(`[data-slug="${slug}"]`) as HTMLElement | null;
      const container = scrollRef.current;
      if (btn && container) {
        const scrollLeft = btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2;
        container.scrollTo({ left: Math.max(0, scrollLeft), behavior: "smooth" });
      }
    },
    [onScrollTo]
  );

  const scrollNav = useCallback((dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  }, []);

  if (categories.length === 0) return null;

  return (
    <div className="h-12 flex items-center gap-2 min-w-0 w-full overflow-hidden">
      <button
        type="button"
        onClick={() => scrollNav("left")}
        className="hidden lg:flex flex-shrink-0 w-10 h-10 items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
        aria-label="Scroll categories left"
      >
        ‹
      </button>

      <div
        ref={scrollRef}
        className="flex-1 min-w-0 h-full overflow-x-auto overflow-y-hidden scrollbar-hide flex items-center gap-4 px-3 scroll-smooth touch-pan-x"
      >
          {categories.map((cat) => (
            <button
              key={cat.id}
              data-slug={cat.slug}
              type="button"
              onClick={() => scrollTo(cat.slug)}
              className={`font-semibold text-xs tracking-wider uppercase py-2 px-3.5 rounded-md whitespace-nowrap flex-shrink-0 transition-all ${
                activeId === cat.slug
                  ? "text-charcoal bg-gold shadow-[0_2px_8px_rgba(193,154,53,0.4)]"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {cat.name}
            </button>
          ))}
      </div>

      <button
        type="button"
        onClick={() => scrollNav("right")}
        className="hidden lg:flex flex-shrink-0 w-10 h-10 items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
        aria-label="Scroll categories right"
      >
        ›
      </button>
    </div>
  );
}
