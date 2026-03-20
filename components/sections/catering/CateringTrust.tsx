"use client";

import { motion } from "framer-motion";

const TRUST_ITEMS = [
  {
    stat: "25+",
    title: "Years Cooking in Vallejo",
    description:
      "We've cooked for families, offices, schools, and celebrations across the Bay Area since 2000.",
  },
  {
    stat: "200",
    title: "Guests, No Problem",
    description:
      "Our catering handles groups from 10 to 200. Same quality regardless of the count.",
  },
  {
    stat: "2",
    title: "Complete Menus to Choose From",
    description:
      "Mexican catering or breakfast catering — or combine both for an event that covers everyone.",
  },
];

export default function CateringTrust() {
  return (
    <section id="trust" className="py-20 md:py-24 bg-white">
      <div className="container max-w-[1140px] mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="font-semibold text-xs tracking-[0.2em] uppercase text-teal">
            Why Momo&apos;s
          </span>
          <div className="flex items-center justify-center gap-4 my-2">
            <span className="flex-1 max-w-[120px] h-[1.5px] bg-gold" />
            <span className="flex-1 max-w-[120px] h-[1.5px] bg-gold" />
          </div>
          <h2 className="font-display text-[clamp(38px,6vw,64px)] leading-none text-charcoal mt-2 mb-3">
            Vallejo Trusts Us
          </h2>
          <p className="text-base text-charcoal/65 max-w-[520px] mx-auto leading-relaxed">
            We&apos;ve been feeding this community since 2000. Catering is just that same kitchen — at scale.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TRUST_ITEMS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-cream border border-cream-dark rounded-2xl p-7 hover:border-teal-light hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <span className="font-display text-5xl text-red leading-none block mb-1.5">
                {item.stat}
              </span>
              <h4 className="font-display text-xl text-charcoal mb-2">
                {item.title}
              </h4>
              <p className="text-sm text-charcoal/60 leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 bg-teal-dark rounded-2xl p-10 md:p-12 flex flex-col md:flex-row gap-6 items-start"
        >
          <span className="text-5xl flex-shrink-0 opacity-80">⭐</span>
          <div className="flex-1">
            <p className="font-medium text-lg text-cream leading-relaxed italic mb-3.5">
              &quot;We ordered the fajita bar for our company lunch and the whole office was talking about it for a week. Portions were huge, everything arrived hot, and they made it easy from start to finish.&quot;
            </p>
            <span className="font-semibold text-xs tracking-[0.2em] uppercase text-gold">
              — Local Vallejo Business, Google Review
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
