"use client";

import { motion } from "framer-motion";
import CateringForm from "./CateringForm";

export default function CateringInquiry() {
  return (
    <section
      id="catering-inquiry"
      className="relative py-20 md:py-24 bg-red overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-100"
        style={{
          backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(0,0,0,0.04) 40px, rgba(0,0,0,0.04) 80px)`,
        }}
      />

      <div className="container max-w-[1140px] mx-auto px-5 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="font-semibold text-xs tracking-[0.2em] uppercase text-white/70">
              Get Started
            </span>
            <div className="flex items-center gap-4 my-2">
              <span className="flex-1 max-w-[80px] h-[1.5px] bg-white/30" />
              <span className="flex-1 max-w-[80px] h-[1.5px] bg-white/30" />
            </div>
            <h2 className="font-display text-[clamp(38px,5.5vw,62px)] leading-none text-white mt-2 mb-4">
              Ready to Plan Your Event?
            </h2>
            <p className="text-base text-white/78 leading-relaxed mb-3">
              Fill out the form and we&apos;ll get back to you within 24 hours with a menu recommendation and quote. No commitment required.
            </p>
            <p className="text-base text-white/78 leading-relaxed mb-0">
              Prefer to talk? We&apos;re happy to go over options by phone.
            </p>

            <div className="mt-7 flex flex-col gap-3">
              <a
                href="tel:+17076547180"
                className="flex items-center gap-2.5 font-medium text-sm text-white/85 hover:text-cream transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-base flex-shrink-0">
                  📞
                </span>
                (707) 654-7180
              </a>
              <div className="flex items-center gap-2.5 font-medium text-sm text-white/85">
                <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-base flex-shrink-0">
                  📍
                </span>
                Vallejo, CA — Serving the Bay Area
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-8">
              {["Response within 24 hours", "No commitment to inquire", "Custom menus available"].map(
                (pill) => (
                  <span
                    key={pill}
                    className="bg-white/10 border border-white/20 text-white/80 text-xs py-1.5 px-3.5 rounded-full font-semibold tracking-wider"
                  >
                    {pill}
                  </span>
                )
              )}
            </div>
          </motion.div>

          {/* Right: Form card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className="bg-white rounded-2xl p-8 md:p-9 shadow-[0_8px_0_rgba(0,0,0,0.15),0_24px_64px_rgba(0,0,0,0.2)]">
              <CateringForm variant="inline" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
