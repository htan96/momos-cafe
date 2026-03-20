"use client";

import { motion } from "framer-motion";

const chapters = [
  {
    icon: "🧹",
    year: "1990s",
    title: "Dishwasher to Cook",
    description: "Started at the bottom of the kitchen and worked every station before running his own.",
  },
  {
    icon: "🏠",
    year: "2001–2006 — South San Francisco",
    title: "First Restaurant: Country Cottage Café",
    description: "Purchased and operated his first place. Learned what it really means to run a restaurant.",
  },
  {
    icon: "🌉",
    year: "2006 — Vallejo",
    title: "Momo's Café Opens",
    description: "Moved the operation home. Springs Road. A new name. The Momo's era begins.",
  },
  {
    icon: "🔥",
    year: "2025",
    title: "The Fire — and What Came Next",
    description: "Georgia Street burns. The doors close. The story doesn't end.",
  },
];

export default function NarrativeIntro() {
  return (
    <section id="story-intro" className="py-20 md:py-24 bg-white">
      <div className="container max-w-[1140px] mx-auto px-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: story text */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="font-semibold text-xs tracking-[0.2em] uppercase text-teal">
              The Beginning
            </span>
            <div className="flex items-center gap-4 my-2">
              <span className="flex-1 h-[1.5px] bg-gold" />
              <span className="flex-1 h-[1.5px] bg-gold" />
            </div>
            <h2 className="font-display text-[clamp(36px,5vw,56px)] leading-none text-charcoal mt-2 mb-5">
              A Name Built From Scratch
            </h2>

            <p className="text-base text-charcoal/70 leading-relaxed mb-3.5">
              Momo&apos;s isn&apos;t a person. It&apos;s a name that became a promise —
              <strong className="text-charcoal font-bold">
                {" "}a promise that the food would be honest, the portions real, and the welcome genuine.
              </strong>
            </p>
            <p className="text-base text-charcoal/70 leading-relaxed mb-3.5">
              Behind that name is a father who didn&apos;t inherit a restaurant.
              He earned his way up from the bottom of the kitchen — dishwasher, prep cook, line cook — learning
              every station before he ever ran one. By the time he opened his own doors in the early 2000s,
              he had already spent years proving he knew what it took.
            </p>
            <p className="text-base text-charcoal/70 leading-relaxed mb-3.5">
              That work ethic is still in the food. Every burrito, every breakfast plate, every plate of
              huevos rancheros carries the same standard: cook it right, make it big, send people home full.
            </p>

            <div className="mt-7 pl-6 py-5 border-l-4 border-gold bg-cream rounded-r-lg">
              <p className="font-medium text-lg text-charcoal leading-relaxed italic m-0">
                &quot;He didn&apos;t open a restaurant to be famous. He opened one because he knew how to feed people — and Vallejo needed a place like this.&quot;
              </p>
            </div>
          </motion.div>

          {/* Right: chapter cards */}
          <div className="flex flex-col gap-4">
            {chapters.map((chapter, i) => (
              <motion.div
                key={chapter.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-cream border border-cream-dark rounded-2xl p-5 flex gap-4 items-start hover:border-teal-light hover:shadow-lg hover:translate-x-1 transition-all"
              >
                <div className="w-12 h-12 flex-shrink-0 bg-white rounded-xl flex items-center justify-center text-2xl">
                  {chapter.icon}
                </div>
                <div>
                  <span className="font-semibold text-[11px] tracking-[0.15em] uppercase text-teal block mb-1">
                    {chapter.year}
                  </span>
                  <h4 className="font-semibold text-[15px] text-charcoal mb-1">
                    {chapter.title}
                  </h4>
                  <p className="text-[13px] text-charcoal/55 leading-snug">
                    {chapter.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
