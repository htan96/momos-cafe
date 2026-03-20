"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function OurStoryCTA() {
  return (
    <section id="story-closing" className="relative py-20 md:py-24 bg-teal-dark overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(74,139,140,0.4) 0%, transparent 70%)",
        }}
      />

      <div className="container max-w-[1140px] mx-auto px-5 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-[700px] mx-auto"
        >
          <span className="font-semibold text-xs tracking-[0.2em] uppercase text-gold">
            Vallejo&apos;s Café
          </span>
          <div className="flex items-center justify-center gap-4 my-2 max-w-[300px] mx-auto">
            <span className="flex-1 h-[1.5px] bg-gold" />
            <span className="flex-1 h-[1.5px] bg-gold" />
          </div>
          <h2 className="font-display text-[clamp(42px,7vw,72px)] leading-[0.95] text-cream mt-3 mb-5">
            Thank You,
            <span className="block text-gold">Vallejo.</span>
          </h2>
          <p className="text-[17px] text-white/70 leading-relaxed mb-9 max-w-[520px] mx-auto">
            You kept asking when we&apos;d be back after the fire.
            You showed up to the pop-up before we even had a proper sign.
            <strong className="text-teal-light"> This place exists because of you</strong> —
            and we plan to keep feeding you for another 25 years.
          </p>
          <div className="flex gap-3.5 flex-wrap justify-center">
            <Link
              href="/menu"
              className="inline-flex items-center justify-center font-semibold text-base tracking-wider uppercase py-4 px-9 rounded-lg bg-red text-white shadow-[0_4px_0_#800] hover:opacity-90 transition-opacity"
            >
              Order Now
            </Link>
            <Link
              href="/menu"
              className="inline-flex items-center justify-center font-semibold text-[15px] tracking-wider uppercase py-3.5 px-7 rounded-lg bg-transparent text-white border-2 border-white/70 hover:bg-white/15 transition-all"
            >
              View Full Menu
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
