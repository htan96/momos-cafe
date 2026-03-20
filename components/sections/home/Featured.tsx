"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  menuitems: { id: string; name: string }[];
}

export default function Featured() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/menu");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setCategories(data || []);
      } catch {
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const block1 = categories[0];
  const block2 = categories[1];

  return (
    <section id="featured" className="py-16 md:py-20">
      <div className="container max-w-[1140px] mx-auto px-5">
        <div className="text-center mb-12">
          <span className="font-semibold text-xs tracking-[0.2em] uppercase text-teal">
            Our Specialties
          </span>
          <div className="flex items-center gap-4 my-2">
            <span className="flex-1 h-[1.5px] bg-gold" />
            <span className="flex-1 h-[1.5px] bg-gold" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl text-charcoal mt-2 mb-3">
            Made to Fill You Up
          </h2>
          <p className="text-charcoal/65 max-w-[500px] mx-auto">
            From sunrise to afternoon, we have got the plate that hits.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="min-h-[320px] md:min-h-[420px] rounded-2xl bg-cream/50 animate-pulse" />
            <div className="min-h-[320px] md:min-h-[420px] rounded-2xl bg-cream/50 animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl overflow-hidden relative min-h-[320px] md:min-h-[420px] flex flex-col justify-end cursor-pointer group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#f7d794] to-[#f0a500] flex items-center justify-center text-[120px] group-hover:scale-105 transition-transform duration-500">
                🍳
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="relative z-10 p-7">
                <span className="inline-block bg-gold text-white font-semibold text-xs tracking-wider uppercase py-1 px-2.5 rounded mb-3">
                  Breakfast — 8am to 4pm
                </span>
                <h3 className="font-display text-3xl md:text-4xl text-white leading-tight mb-2">
                  {block1?.name ?? "Breakfast Favorites"}
                </h3>
                <p className="text-sm text-white/75 leading-relaxed mb-4">
                  {block1?.menuitems?.length
                    ? `Try our ${block1.menuitems.slice(0, 3).map((i) => i.name).join(", ")} and more.`
                    : "Golden hash browns, farm-fresh eggs, fluffy pancakes, and burritos packed to the edge."}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {(block1?.menuitems?.slice(0, 5) ?? [
                    "Chorizo Plate",
                    "Huevos Rancheros",
                    "California Burrito",
                    "Veggie Omelet",
                    "Pancake Stack",
                  ]).map((item) => (
                    <span
                      key={typeof item === "string" ? item : item.id}
                      className="bg-white/15 border border-white/25 text-white text-xs font-medium py-1 px-3 rounded-full"
                    >
                      {typeof item === "string" ? item : item.name}
                    </span>
                  ))}
                </div>
                <Link
                  href="/menu"
                  className="inline-flex items-center justify-center font-semibold text-sm tracking-wider uppercase py-2.5 px-5 rounded-lg bg-transparent text-white border-2 border-white/70 hover:bg-white/15 transition-all"
                >
                  See Breakfast Menu
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl overflow-hidden relative min-h-[320px] md:min-h-[420px] flex flex-col justify-end cursor-pointer group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#c8272d] to-[#8b1a1d] flex items-center justify-center text-[120px] group-hover:scale-105 transition-transform duration-500">
                🍔
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="relative z-10 p-7">
                <span className="inline-block bg-red text-white font-semibold text-xs tracking-wider uppercase py-1 px-2.5 rounded mb-3">
                  Lunch — Opens Daily
                </span>
                <h3 className="font-display text-3xl md:text-4xl text-white leading-tight mb-2">
                  {block2?.name ?? "Lunch Favorites"}
                </h3>
                <p className="text-sm text-white/75 leading-relaxed mb-4">
                  {block2?.menuitems?.length
                    ? `Juicy burgers, carne asada, tacos — ${block2.menuitems.slice(0, 2).map((i) => i.name).join(", ")} and more.`
                    : "Juicy burgers, carne asada plates, tacos, and everything in between."}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {(block2?.menuitems?.slice(0, 5) ?? [
                    "Momo's Burger",
                    "Carne Asada Plate",
                    "Fish Tacos",
                    "Bacon Cheeseburger",
                    "Torta de Carnitas",
                  ]).map((item) => (
                    <span
                      key={typeof item === "string" ? item : item.id}
                      className="bg-white/15 border border-white/25 text-white text-xs font-medium py-1 px-3 rounded-full"
                    >
                      {typeof item === "string" ? item : item.name}
                    </span>
                  ))}
                </div>
                <Link
                  href="/menu"
                  className="inline-flex items-center justify-center font-semibold text-sm tracking-wider uppercase py-2.5 px-5 rounded-lg bg-transparent text-white border-2 border-white/70 hover:bg-white/15 transition-all"
                >
                  See Lunch Menu
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
}
