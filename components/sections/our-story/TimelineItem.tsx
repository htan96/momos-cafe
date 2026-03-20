"use client";

import { motion } from "framer-motion";

export type TimelineItemProps = {
  year: string;
  title: string;
  description: string;
  side: "left" | "right";
  index?: number;
};

export default function TimelineItem({ year, title, description, side, index = 0 }: TimelineItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="relative pl-10 pb-12"
    >
      {/* Dot on spine — aligns with gold border */}
      <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-teal-dark border-2.5 border-gold z-[2] -translate-x-[2.875rem]" />
      <span className="font-semibold text-[11px] tracking-[0.2em] uppercase text-gold block mb-2">
        {year}
      </span>
      <div className="font-display text-2xl text-charcoal leading-tight mb-2">
        {title}
      </div>
      <p className="text-sm text-charcoal/65 leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}
