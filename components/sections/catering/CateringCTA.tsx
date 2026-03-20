"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function CateringCTA() {
  return (
    <section id="catering-close" className="relative py-20 md:py-24 bg-teal-dark overflow-hidden">
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
          className="text-center max-w-[680px] mx-auto"
        >
          <span className="font-semibold text-xs tracking-[0.2em] uppercase text-gold">
            Momo&apos;s Catering
          </span>
          <div className="flex items-center justify-center gap-4 my-2 max-w-[320px] mx-auto">
            <span className="flex-1 h-[1.5px] bg-gold/45" />
            <span className="flex-1 h-[1.5px] bg-gold/45" />
          </div>
          <h2 className="font-display text-[clamp(44px,7vw,74px)] leading-[0.95] text-cream mt-3 mb-5">
            Feed Your People
            <span className="block text-gold">The Right Way.</span>
          </h2>
          <p className="text-[17px] text-white/70 leading-relaxed mb-9">
            Big portions, honest food, and a family that&apos;s been cooking for Vallejo
            for over 25 years. That&apos;s what comes with every catering order.
          </p>
          <div className="flex gap-3.5 flex-wrap justify-center">
            <Link
              href="#catering-inquiry"
              className="inline-flex items-center justify-center font-semibold text-base tracking-wider uppercase py-4 px-9 rounded-lg bg-red text-white shadow-[0_4px_0_#800] hover:opacity-90 transition-opacity"
            >
              Request Catering
            </Link>
            <Link
              href="/menu"
              className="inline-flex items-center justify-center font-semibold text-[15px] tracking-wider uppercase py-3.5 px-7 rounded-lg bg-transparent text-white border-2 border-white/70 hover:bg-white/15 transition-all"
            >
              Browse Full Menu
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
