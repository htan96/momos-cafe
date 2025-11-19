"use client";

import { motion } from "framer-motion";

const timelineData = [
  {
    year: "Early Journey",
    title: "A father begins his career in the kitchen",
    description:
      "From dishwasher to cook — building the foundation for what’s to come.",
  },
  {
    year: "2001–2006 — South San Francisco",
    title: "Country Cottage Café",
    description: "Purchased and operated his first restaurant, Country Cottage Café.",
  },
  {
    year: "2006 — Vallejo",
    title: "Momo’s Café is Born",
    description: "The business moves home. The first Momo’s Café opens on Springs Road.",
  },
  {
    year: "2006–2012 — Springs Road",
    title: "A Neighborhood Staple",
    description:
      "A beloved café that built the roots of the Momo’s name in Vallejo.",
  },
  {
    year: "2012–2025 — Georgia Street",
    title: "A Vallejo Favorite",
    description: "A long chapter where Momo’s became a true community staple.",
  },
  {
    year: "2025 — Pause + Transition",
    title: "An Unexpected Fire",
    description:
      "A fire forces a temporary closure — but not the end of the story.",
  },
  {
    year: "2025–Present — Pop-Up Era",
    title: "New Chapter Inside Morgen’s Kitchen",
    description:
      "Momo’s reopens inside Morgen’s Kitchen, continuing its legacy while preparing for its next home.",
  },
];

export default function Timeline() {
  return (
    <section className="relative py-20 bg-cream text-charcoal">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-teal uppercase tracking-wide">
            Our Story
          </h2>
          <p className="text-base md:text-lg text-charcoal/70 mt-3">
            A journey built on hard work, heart, and Vallejo roots.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative border-l-2 border-gold/40 pl-10">
          {timelineData.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="mb-14 relative"
            >
              {/* Dot */}
              <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-teal border-2 border-gold shadow-md" />

              {/* Content */}
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl shadow-md border border-gold/10 hover:shadow-lg transition">
                <h3 className="text-sm md:text-base text-gold uppercase font-semibold tracking-wide">
                  {item.year}
                </h3>
                <h4 className="text-lg md:text-xl font-display font-bold text-teal mt-1">
                  {item.title}
                </h4>
                <p className="text-sm md:text-base text-charcoal/80 mt-2 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Gold gradient accent at bottom */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-gold/20 to-transparent pointer-events-none" />
    </section>
  );
}
