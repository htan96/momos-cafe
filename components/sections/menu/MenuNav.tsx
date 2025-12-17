"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MenuCategory } from "@/types/menu";

interface MenuNavProps {
  categories: MenuCategory[];
}

export default function MenuNav({ categories }: MenuNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(categories[0]?.slug || "");
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile (touch devices)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.matchMedia("(pointer: coarse)").matches);
    }
  }, []);

  // Scroll horizontally through the nav
  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: dir === "left" ? -200 : 200,
        behavior: "smooth",
      });
    }
  };

  // Click → smooth scroll to section
  const handleClick = (slug: string) => {
    setActive(slug);
    const el = document.getElementById(slug);
    if (el) {
      const yOffset = -140;
      const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  // Track active section while scrolling
  useEffect(() => {
    const handleScroll = () => {
      let current = "";

      for (const category of categories) {
        const el = document.getElementById(category.slug);
        if (el) {
          const top = el.getBoundingClientRect().top;
          if (top <= 180 && top > -400) {
            current = category.slug;
            break;
          }
        }
      }

      if (current && current !== active) {
        setActive(current);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categories, active]);

  return (
    <nav className="fixed top-[80px] left-0 z-40 w-full bg-teal text-gold shadow-md border-b border-gold/30">
      <div className="relative flex items-center">
        {/* Scroll Left */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 px-3 bg-gradient-to-r from-teal via-teal/90 to-transparent hover:opacity-80 transition"
        >
          <ChevronLeft className="w-4 h-4 text-gold" />
        </button>

        {/* Category Buttons */}
        <div
          ref={scrollRef}
          className="flex gap-8 px-10 py-3 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => handleClick(cat.slug)}
              className={`relative uppercase tracking-wide font-medium transition-colors duration-200 ${
                active === cat.slug
                  ? "text-gold font-semibold"
                  : "text-cream hover:text-gold"
              }`}
            >
              {cat.name}

              {/* 🔽 Underline */}
              {active === cat.slug &&
                (isMobile ? (
                  // ✅ MOBILE: no animation
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-gold" />
                ) : (
                  // ✅ DESKTOP: animated
                  <AnimatePresence>
                    <motion.span
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      exit={{ scaleX: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      style={{ originX: 0 }}
                      className="absolute bottom-0 left-0 w-full h-[2px] bg-gold"
                    />
                  </AnimatePresence>
                ))}
            </button>
          ))}
        </div>

        {/* Scroll Right */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 px-3 bg-gradient-to-l from-teal via-teal/90 to-transparent hover:opacity-80 transition"
        >
          <ChevronRight className="w-4 h-4 text-gold" />
        </button>
      </div>
    </nav>
  );
}
