"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const deals = [
  {
    emoji: "🥪",
    badge: "Fan Favorite",
    badgeClass: "bg-teal",
    title: "2 Breakfast Sandwiches",
    description:
      "Mix and match — egg and cheese, bacon, sausage, or ham on your choice of bread.",
    price: "$6",
    was: "$9+",
  },
  {
    emoji: "🍔🍟",
    badge: "Combo Deal",
    badgeClass: "bg-red",
    title: "Cheeseburger + Fries",
    description:
      "Our classic cheeseburger paired with a full order of crispy golden fries. A true lunch staple.",
    price: "$11",
    was: "$15+",
  },
  {
    emoji: "🌯",
    badge: "Morning Must",
    badgeClass: "bg-gold",
    title: "Breakfast Burrito",
    description:
      "Loaded with eggs, potatoes, cheese and your choice of meat. Big enough to keep you going all day.",
    price: "$12",
    was: null,
  },
];

export default function Deals() {
  return (
    <section
      id="deals"
      className="relative py-16 md:py-[72px] bg-red overflow-hidden"
    >
      {/* Diagonal stripe pattern */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(0,0,0,0.04) 40px, rgba(0,0,0,0.04) 80px)",
        }}
        aria-hidden
      />

      <div className="container max-w-[1140px] mx-auto px-5 relative z-10">
        <div className="text-center mb-10 md:mb-12">
          <span className="font-semibold text-xs tracking-[0.2em] uppercase text-gold">
            Every Day, All Day
          </span>
          <div className="flex items-center gap-4 my-2">
            <span className="flex-1 h-[1.5px] bg-gold" />
            <span className="flex-1 h-[1.5px] bg-gold" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl text-white mt-2 mb-3">
            Today&apos;s Deals
          </h2>
          <p className="text-white/75 max-w-[500px] mx-auto">
            No catches, no expiry — these deals run every single day.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {deals.map((deal, i) => (
            <motion.div
              key={deal.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white rounded-2xl p-6 md:p-7 flex flex-col shadow-[0_6px_0_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-transform"
            >
              <span className="text-5xl block mb-3">{deal.emoji}</span>
              <span
                className={`inline-block font-semibold text-xs tracking-[0.15em] uppercase text-white py-1 px-2.5 rounded mb-3 w-fit ${deal.badgeClass}`}
              >
                {deal.badge}
              </span>
              <h3 className="font-display text-2xl md:text-3xl text-charcoal leading-tight mb-2">
                {deal.title}
              </h3>
              <p className="text-sm text-charcoal/60 leading-relaxed mb-5 flex-1">
                {deal.description}
              </p>
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-5xl text-red leading-none">
                  {deal.price}
                </span>
                {deal.was && (
                  <span className="font-medium text-sm text-charcoal/40 line-through">
                    {deal.was}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/menu"
            className="inline-flex items-center justify-center font-semibold text-base py-4 px-9 rounded-lg bg-white text-red shadow-[0_4px_0_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all"
          >
            Order and Save Now
          </Link>
        </div>
      </div>
    </section>
  );
}
