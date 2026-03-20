"use client";

import { motion } from "framer-motion";

const EVENTS = [
  {
    icon: "🏢",
    tag: "Corporate",
    tagClass: "bg-teal text-white",
    title: "Corporate Events & Office Meals",
    description:
      "Morning kickoffs, team lunches, company celebrations. We set up, serve, and keep it professional. Great for offices across Vallejo and the greater Bay Area.",
    footer: "✓ Ideal for 15–200 guests",
  },
  {
    icon: "🎉",
    tag: "Celebrations",
    tagClass: "bg-gold text-charcoal",
    title: "Private Parties & Celebrations",
    description:
      "Birthdays, graduations, quinceañeras, family reunions. Generous portions that feel like home cooking — because they are. Customizable menus to fit your occasion.",
    footer: "✓ Fully customizable menu",
  },
  {
    icon: "🍳",
    tag: "Breakfast",
    tagClass: "bg-teal-dark text-white",
    title: "Breakfast & Brunch Spreads",
    description:
      "Full breakfast stations with waffles, pancakes, eggs, and every protein you need. The same morning energy that makes Momo's a Vallejo staple — scaled for your crowd.",
    footer: "✓ Waffle & pancake stations available",
  },
  {
    icon: "🌮",
    tag: "Mexican Favorites",
    tagClass: "bg-red text-white",
    title: "Taco Bar & Fajita Bar",
    description:
      "Interactive food stations that guests love. Full toppings setup, multiple protein choices, flour and corn tortillas. The flavor people come to Momo's for — now at your venue.",
    footer: "✓ Full toppings station included",
  },
];

export default function CateringServices() {
  return (
    <section id="event-types" className="py-20 md:py-24 bg-white">
      <div className="container max-w-[1140px] mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="font-semibold text-xs tracking-[0.2em] uppercase text-teal">
            What We Offer
          </span>
          <div className="flex items-center justify-center gap-4 my-2">
            <span className="flex-1 max-w-[120px] h-[1.5px] bg-gold" />
            <span className="flex-1 max-w-[120px] h-[1.5px] bg-gold" />
          </div>
          <h2 className="font-display text-[clamp(38px,6vw,64px)] leading-none text-charcoal mt-2 mb-3">
            Events We Cater
          </h2>
          <p className="text-base text-charcoal/65 max-w-[520px] mx-auto leading-relaxed">
            From early morning office breakfasts to weekend parties — we bring the food, you enjoy the event.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {EVENTS.map((event, i) => (
            <motion.div
              key={event.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-cream border border-cream-dark rounded-2xl p-7 flex flex-col hover:border-teal-light hover:shadow-lg hover:-translate-y-1 transition-all"
            >
              <span className="text-4xl block mb-4">{event.icon}</span>
              <span
                className={`inline-block font-semibold text-[10px] tracking-[0.2em] uppercase py-1 px-2.5 rounded mb-3 ${event.tagClass}`}
              >
                {event.tag}
              </span>
              <h3 className="font-display text-2xl text-charcoal leading-tight mb-2.5">
                {event.title}
              </h3>
              <p className="text-sm text-charcoal/62 leading-relaxed flex-1">
                {event.description}
              </p>
              <div className="mt-5 pt-4 border-t border-cream-dark font-semibold text-xs tracking-wider uppercase text-teal flex items-center gap-1.5">
                {event.footer}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
