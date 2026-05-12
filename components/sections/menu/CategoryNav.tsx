"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { MenuCategory } from "@/types/menu";
import CommerceCategoryPill from "@/components/commerce/CommerceCategoryPill";

const STICKY_OFFSET = 140; // header + category nav height

interface CategoryNavProps {
  categories: MenuCategory[];
  headerOffset?: number;
  onScrollTo?: (slug: string) => void;
  /** When true, nav is inside header — match shop filter chip strip (cream / charcoal). */
  embeddedInHeader?: boolean;
}

export default function CategoryNav({
  categories,
  onScrollTo,
  embeddedInHeader = false,
}: CategoryNavProps) {
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

  const scrollNav = useCallback((dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  }, []);

  if (categories.length === 0) return null;

  const shellClass = embeddedInHeader
    ? "bg-cream/95 backdrop-blur-md border-b border-cream-dark/70 shadow-[0_8px_20px_-12px_rgba(44,44,44,0.12)]"
    : "sticky top-[64px] z-[700] bg-cream/95 backdrop-blur-md border-b border-cream-dark/70 shadow-[0_8px_20px_-12px_rgba(44,44,44,0.12)] -mt-2";

  return (
    <nav id="cat-nav" className={`h-[52px] ${shellClass}`} aria-label="Menu categories">
      <div className="max-w-[1200px] mx-auto h-full flex items-center min-w-0 overflow-hidden">
        <button
          type="button"
          onClick={() => scrollNav("left")}
          className="hidden lg:flex flex-shrink-0 w-10 h-10 items-center justify-center text-charcoal/50 hover:text-teal-dark hover:bg-white/80 rounded-md transition-colors"
          aria-label="Scroll categories left"
        >
          ‹
        </button>

        <div
          ref={scrollRef}
          className="flex-1 min-w-0 h-full overflow-x-auto overflow-y-hidden scrollbar-hide flex items-center gap-2 px-3 touch-pan-x py-2"
        >
          {categories.map((cat) => (
            <CommerceCategoryPill
              key={cat.slug}
              id={`cat-${cat.slug}`}
              dataSlug={cat.slug}
              label={cat.name}
              active={activeId === cat.slug}
              onClick={() => scrollTo(cat.slug)}
              className="whitespace-nowrap"
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollNav("right")}
          className="hidden lg:flex flex-shrink-0 w-10 h-10 items-center justify-center text-charcoal/50 hover:text-teal-dark hover:bg-white/80 rounded-md transition-colors"
          aria-label="Scroll categories right"
        >
          ›
        </button>
      </div>
    </nav>
  );
}
