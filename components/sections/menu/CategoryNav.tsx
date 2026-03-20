"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { MenuCategory } from "@/types/menu";

const STICKY_OFFSET = 140; // header + category nav height

interface CategoryNavProps {
  categories: MenuCategory[];
  headerOffset?: number;
  onScrollTo?: (slug: string) => void;
}

export default function CategoryNav({
  categories,
  onScrollTo,
}: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>(categories[0]?.slug ?? "");
  const visibleRef = useRef<Map<string, number>>(new Map());

  // IntersectionObserver: track which sections are in view, pick the topmost as active
  useEffect(() => {
    if (categories.length === 0) return;

    const updateActive = () => {
      const visible = visibleRef.current;
      if (visible.size === 0) return;
      let best: string | null = null;
      let bestTop = Infinity;
      visible.forEach((top, slug) => {
        if (top < bestTop && top <= STICKY_OFFSET + 50) {
          bestTop = top;
          best = slug;
        }
      });
      if (!best && visible.size > 0) {
        visible.forEach((top, slug) => {
          if (top < bestTop) {
            bestTop = top;
            best = slug;
          }
        });
      }
      if (best) setActiveId(best);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const slug = entry.target.getAttribute("data-category-slug");
          if (!slug) return;
          if (entry.isIntersecting) {
            visibleRef.current.set(slug, entry.boundingClientRect.top);
          } else {
            visibleRef.current.delete(slug);
          }
        });
        updateActive();
      },
      {
        root: null,
        rootMargin: `-${STICKY_OFFSET}px 0px -40% 0px`,
        threshold: 0,
      }
    );

    categories.forEach((cat) => {
      const el = document.getElementById(cat.slug);
      if (el) {
        el.setAttribute("data-category-slug", cat.slug);
        observer.observe(el);
      }
    });

    return () => {
      observer.disconnect();
      visibleRef.current.clear();
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
    <nav
      id="cat-nav"
      className="sticky top-[64px] z-[700] bg-teal-dark border-b-2 border-white/[0.08] h-[52px]"
      aria-label="Menu categories"
    >
      <div className="max-w-[1200px] mx-auto h-full flex items-center">
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
          className="flex-1 min-w-0 h-full overflow-x-auto overflow-y-hidden scrollbar-hide flex items-center gap-1 px-3"
        >
          {categories.map((cat) => (
            <button
              key={cat.slug}
              data-slug={cat.slug}
              type="button"
              onClick={() => scrollTo(cat.slug)}
              className={`font-semibold text-xs tracking-[0.12em] uppercase py-2 px-3.5 rounded-md whitespace-nowrap flex-shrink-0 transition-all duration-150 ${
                activeId === cat.slug
                  ? "text-charcoal bg-gold shadow-[0_2px_8px_rgba(193,154,53,0.4)]"
                  : "text-white/65 bg-transparent hover:text-white hover:bg-white/10"
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
    </nav>
  );
}
