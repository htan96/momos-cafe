"use client";

import { motion } from "framer-motion";

const whyItems = [
  {
    icon: "⚡",
    stat: "15 min",
    title: "Fast Service",
    description:
      "We move quick without cutting corners. Your food comes out hot, fast, and right.",
  },
  {
    icon: "🥊",
    stat: "BIG",
    title: "Generous Portions",
    description:
      "No tiny plates here. We believe you should leave full — every single time.",
  },
  {
    icon: "📍",
    stat: "Local",
    title: "Community Roots",
    description:
      "Born and raised in Vallejo. We know our regulars by name and remember your order.",
  },
  {
    icon: "❤️",
    stat: "Fresh",
    title: "Made With Love",
    description:
      "Real ingredients, real recipes, real care. You can taste the difference.",
  },
];

export default function Why() {
  return (
    <section id="why" className="relative py-16 md:py-20 bg-teal overflow-hidden">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(74,139,140,0.4) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      <div className="container max-w-[1140px] mx-auto px-5 relative z-10">
        <div className="text-center mb-12">
          <span className="font-semibold text-xs tracking-[0.2em] uppercase text-gold">
            Why Vallejo Keeps Coming Back
          </span>
          <div className="flex items-center gap-4 my-2">
            <span className="flex-1 h-[1.5px] bg-gold" />
            <span className="flex-1 h-[1.5px] bg-gold" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl text-cream mt-2 mb-3">
            People Love Us Because
          </h2>
          <p className="text-white/65 max-w-[500px] mx-auto">
            We are not a chain. We are your neighborhood spot — and we show up
            every single day.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {whyItems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center backdrop-blur-sm hover:-translate-y-1.5 hover:bg-white/10 transition-all"
            >
              <span className="text-5xl block mb-4">{item.icon}</span>
              <span className="font-display text-4xl text-gold block mb-1">
                {item.stat}
              </span>
              <h3 className="font-display text-2xl text-cream mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-white/65 leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
