"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number | null;
}

interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  menuitems: MenuItem[];
}

const EMOJI_MAP: Record<string, string> = {
  breakfast: "🍳",
  burrito: "🌯",
  griddle: "🥞",
  omelet: "🍽",
  lunch: "🥙",
  burger: "🍔",
  mexican: "🫔",
  drink: "☕",
  default: "🍴",
};

function getEmojiForCategory(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (key !== "default" && lower.includes(key)) return emoji;
  }
  return EMOJI_MAP.default;
}

export default function HomeMenuPreview() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/menu", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setCategories(data || []);
        setActiveTab(0);
      } catch {
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeCategory = categories[activeTab];

  return (
    <section id="menu-preview" className="py-16 md:py-20 bg-white">
      <div className="container max-w-[1140px] mx-auto px-5">
        <div className="text-center mb-10 md:mb-12">
          <span className="font-semibold text-xs tracking-[0.2em] uppercase text-teal">
            The Full Spread
          </span>
          <div className="flex items-center gap-4 my-2">
            <span className="flex-1 h-[1.5px] bg-gold" />
            <span className="flex-1 h-[1.5px] bg-gold" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl text-charcoal mt-2 mb-3">
            Our Menu
          </h2>
          <p className="text-charcoal/65 max-w-[500px] mx-auto">
            Something for everyone — morning to afternoon, plates to burritos,
            classic to Mexican.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-cream/50"
              />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-charcoal/60 mb-6">No menu items yet.</p>
            <Link
              href="/menu"
              className="inline-flex items-center justify-center font-semibold py-3 px-6 rounded-lg bg-teal text-white hover:bg-teal/90 transition-colors"
            >
              View Full Menu
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 justify-center mb-10">
              {categories.map((cat, i) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(i)}
                  className={`font-semibold text-sm tracking-wider uppercase py-2 px-4 rounded-full border-2 transition-all ${
                    activeTab === i
                      ? "bg-teal text-white border-teal shadow-[0_4px_16px_rgba(45,107,107,0.3)]"
                      : "border-teal bg-transparent text-teal hover:bg-teal hover:text-white"
                  }`}
                >
                  {getEmojiForCategory(cat.name)} {cat.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeCategory?.menuitems?.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-cream rounded-2xl p-5 flex gap-4 items-start border border-cream/80 hover:border-aqua/30 hover:shadow-[0_4px_20px_rgba(74,139,140,0.15)] hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-12 h-12 flex-shrink-0 bg-white rounded-xl flex items-center justify-center text-2xl">
                    {getEmojiForCategory(activeCategory.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-base text-charcoal mb-1">
                      {item.name}
                    </h4>
                    <p className="text-xs text-charcoal/55 leading-snug">
                      {item.description || "Description coming soon."}
                    </p>
                  </div>
                  <span className="font-bold text-base text-red flex-shrink-0">
                    {item.price != null ? `$${item.price}` : "--"}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link
                href="/menu"
                className="inline-flex items-center justify-center font-semibold py-3 px-8 rounded-lg bg-teal text-white hover:bg-teal/90 transition-colors"
              >
                View Full Menu
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
