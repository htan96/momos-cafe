"use client";

import { motion } from "framer-motion";
import TimelineItem from "./TimelineItem";
import { FireCard, ComebackCard } from "./HighlightSection";

const timelineData: Array<{ year: string; title: string; description: string; side: "left" | "right" }> = [
  {
    year: "1990s — The Early Years",
    title: "Started at the Bottom",
    description:
      "Nobody handed him a restaurant. He started as a dishwasher — the unglamorous entry point for most great cooks. Station by station, he learned every job in the kitchen until he could run them all.",
    side: "left",
  },
  {
    year: "2001–2006 — South San Francisco",
    title: "Country Cottage Café",
    description:
      "His first restaurant — purchased and operated in South San Francisco. It was the proving ground: managing staff, running a kitchen, building a menu. Everything that would make Momo's possible was learned here.",
    side: "right",
  },
  {
    year: "2006 — Springs Road, Vallejo",
    title: "Momo's Café Is Born",
    description:
      "He came home. Springs Road became the first address. A breakfast and lunch spot with a short menu, big portions, and a name that Vallejo hadn't heard yet — but would soon know well.",
    side: "left",
  },
  {
    year: "2006–2012 — Springs Road",
    title: "A Neighborhood Staple Takes Root",
    description:
      "Six years at Springs Road. The regulars came every week. Word spread the way good food always does — by someone telling someone else where they ate that morning.",
    side: "right",
  },
  {
    year: "2012–2025 — Georgia Street, Vallejo",
    title: "A Vallejo Institution",
    description:
      "Thirteen years at Georgia Street. Long enough to become part of the neighborhood, not just a restaurant in it. Generations of Vallejo families ate here. It became the kind of place people came back to after moving away.",
    side: "left",
  },
];

export default function TimelineSection() {
  return (
    <section id="timeline" className="py-20 md:py-24 bg-cream relative overflow-hidden">
      {/* Bottom gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[120px] pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(193,154,53,0.08), transparent)",
        }}
      />

      <div className="container max-w-[1140px] mx-auto px-5 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="font-semibold text-xs tracking-[0.2em] uppercase text-teal">
            The Full Journey
          </span>
          <div className="flex items-center justify-center gap-4 my-2">
            <span className="flex-1 max-w-[120px] h-[1.5px] bg-gold" />
            <span className="flex-1 max-w-[120px] h-[1.5px] bg-gold" />
          </div>
          <h2 className="font-display text-[clamp(38px,6vw,64px)] leading-none text-charcoal mt-2 mb-3">
            Chapter by Chapter
          </h2>
          <p className="text-base text-charcoal/65 max-w-[500px] mx-auto leading-relaxed">
            Twenty-five years isn&apos;t a straight line. Here&apos;s how it actually went.
          </p>
        </motion.div>

        {/* Timeline — left border with spine */}
        <div className="max-w-[900px] mx-auto relative border-l-2 border-gold pl-10 md:pl-14">
          {timelineData.map((item, index) => (
            <TimelineItem
              key={`${item.year}-${item.title}`}
              {...item}
              index={index}
            />
          ))}

          <div className="pt-4">
            <FireCard />
            <ComebackCard />
          </div>
        </div>
      </div>
    </section>
  );
}
