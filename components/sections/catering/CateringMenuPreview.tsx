"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const MEXICAN_ITEMS = {
  proteins: [
    { label: "Carne Asada (Steak)", highlight: true },
    { label: "Chicken", highlight: true },
    { label: "Shrimp", highlight: true },
  ],
  vegetables: ["Tomatoes", "Bell Peppers", "Onions", "Potatoes"],
  sides: ["Mexican Rice", "Black Beans", "Refried Beans"],
  toppings: [
    "Flour Tortillas",
    "Corn Tortillas",
    "Guacamole",
    "Sour Cream",
    "Shredded Cheese",
    "Salsa",
    "Onions",
    "Cilantro",
  ],
};

const BREAKFAST_ITEMS = {
  bases: [
    { label: "Waffles", highlight: true },
    { label: "Pancakes", highlight: true },
    { label: "French Toast", highlight: true },
    { label: "Chicken & Waffles", highlight: false },
  ],
  eggs: ["Scrambled", "Fried", "Over Easy", "Over Medium", "Over Hard"],
  proteins: [
    "Bacon",
    "Sausage",
    "Ham",
    "Canadian Bacon",
    "Linguica",
    "Fried Chicken",
    "NY Strip Steak",
  ],
  sides: ["Country Potatoes", "Mexican Rice", "Refried Beans"],
};

function MenuPills({ items }: { items: { label: string; highlight?: boolean }[] | string[] }) {
  const normalized = items.map((i) =>
    typeof i === "string" ? { label: i, highlight: false } : i
  );
  return (
    <div className="flex flex-wrap gap-2">
      {normalized.map((item) => (
        <span
          key={item.label}
          className={`text-[13px] py-1.5 px-3 rounded-full border transition-colors ${
            item.highlight
              ? "bg-teal-dark text-white border-teal-dark font-semibold"
              : "bg-cream border-cream-dark text-charcoal hover:border-teal-light hover:bg-teal/5"
          }`}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}

function ProteinList({ items }: { items: string[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
      {items.map((item) => (
        <div key={item} className="flex items-center gap-2 text-[13.5px] text-charcoal/70 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-teal flex-shrink-0" />
          {item}
        </div>
      ))}
    </div>
  );
}

export default function CateringMenuPreview() {
  return (
    <section id="catering-menu" className="py-20 md:py-24 bg-cream">
      <div className="container max-w-[1140px] mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="font-semibold text-xs tracking-[0.2em] uppercase text-teal">
            The Food
          </span>
          <div className="flex items-center justify-center gap-4 my-2">
            <span className="flex-1 max-w-[120px] h-[1.5px] bg-gold" />
            <span className="flex-1 max-w-[120px] h-[1.5px] bg-gold" />
          </div>
          <h2 className="font-display text-[clamp(38px,6vw,64px)] leading-none text-charcoal mt-2 mb-3">
            Catering Favorites
          </h2>
          <p className="text-base text-charcoal/65 max-w-[520px] mx-auto leading-relaxed">
            Everything is made fresh. Every option is the same quality you get at the restaurant — just scaled up.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
          {/* Mexican */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white border border-cream-dark rounded-2xl overflow-hidden hover:border-teal-light hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3.5 p-6 border-b border-cream-dark">
              <span className="text-4xl">🌮</span>
              <div>
                <span className="inline-block font-semibold text-[11px] tracking-[0.15em] uppercase bg-red text-white py-1 px-2.5 rounded mb-1">
                  Mexican Catering
                </span>
                <h3 className="font-display text-2xl text-charcoal leading-none">
                  Fajita Bar &amp; Taco Bar
                </h3>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <div className="font-semibold text-[11px] tracking-[0.2em] uppercase text-gold mb-2.5 flex items-center gap-2">
                  Proteins — Choose Any
                  <span className="flex-1 h-px bg-cream-dark" />
                </div>
                <MenuPills items={MEXICAN_ITEMS.proteins} />
              </div>
              <div>
                <div className="font-semibold text-[11px] tracking-[0.2em] uppercase text-gold mb-2.5 flex items-center gap-2">
                  Fajita Vegetables
                  <span className="flex-1 h-px bg-cream-dark" />
                </div>
                <MenuPills items={MEXICAN_ITEMS.vegetables} />
              </div>
              <div>
                <div className="font-semibold text-[11px] tracking-[0.2em] uppercase text-gold mb-2.5 flex items-center gap-2">
                  Sides
                  <span className="flex-1 h-px bg-cream-dark" />
                </div>
                <MenuPills items={MEXICAN_ITEMS.sides} />
              </div>
              <div>
                <div className="font-semibold text-[11px] tracking-[0.2em] uppercase text-gold mb-2.5 flex items-center gap-2">
                  Tortillas &amp; Toppings
                  <span className="flex-1 h-px bg-cream-dark" />
                </div>
                <MenuPills items={MEXICAN_ITEMS.toppings} />
              </div>
            </div>
          </motion.div>

          {/* Breakfast */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-cream-dark rounded-2xl overflow-hidden hover:border-teal-light hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3.5 p-6 border-b border-cream-dark">
              <span className="text-4xl">🥞</span>
              <div>
                <span className="inline-block font-semibold text-[11px] tracking-[0.15em] uppercase bg-teal-dark text-white py-1 px-2.5 rounded mb-1">
                  Breakfast Catering
                </span>
                <h3 className="font-display text-2xl text-charcoal leading-none">
                  Breakfast &amp; Brunch Station
                </h3>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <div className="font-semibold text-[11px] tracking-[0.2em] uppercase text-gold mb-2.5 flex items-center gap-2">
                  Griddle Station — Choose Base
                  <span className="flex-1 h-px bg-cream-dark" />
                </div>
                <MenuPills items={BREAKFAST_ITEMS.bases} />
              </div>
              <div>
                <div className="font-semibold text-[11px] tracking-[0.2em] uppercase text-gold mb-2.5 flex items-center gap-2">
                  Eggs — Any Style
                  <span className="flex-1 h-px bg-cream-dark" />
                </div>
                <MenuPills items={BREAKFAST_ITEMS.eggs} />
              </div>
              <div>
                <div className="font-semibold text-[11px] tracking-[0.2em] uppercase text-gold mb-2.5 flex items-center gap-2">
                  Breakfast Proteins
                  <span className="flex-1 h-px bg-cream-dark" />
                </div>
                <ProteinList items={BREAKFAST_ITEMS.proteins} />
              </div>
              <div>
                <div className="font-semibold text-[11px] tracking-[0.2em] uppercase text-gold mb-2.5 flex items-center gap-2">
                  Sides
                  <span className="flex-1 h-px bg-cream-dark" />
                </div>
                <MenuPills items={BREAKFAST_ITEMS.sides} />
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <p className="font-semibold text-sm tracking-wider uppercase text-charcoal/55 mb-4">
            Custom menus available — just ask
          </p>
          <Link
            href="#catering-inquiry"
            className="inline-flex items-center justify-center font-semibold text-[15px] tracking-wider uppercase py-3.5 px-8 rounded-lg bg-red text-white shadow-[0_4px_0_#a01e23] hover:opacity-90 transition-opacity"
          >
            Get a Custom Quote
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
