"use client";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative bg-[#2F6D66] text-[#D4AF37] text-center py-32 px-6 md:px-12 lg:px-20 overflow-hidden">
      {/* Bottom fade to blend into next section */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-b from-[#2F6D66] via-[#3B7C74] to-[#F5E5C0]"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="relative z-10"
      >
        {/* Main Headline */}
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-[0.07em] uppercase drop-shadow-[0_3px_10px_rgba(0,0,0,0.4)] whitespace-nowrap">
          Breakfast. Lunch. Community.
        </h1>

        {/* Supporting tagline */}
        <p className="font-body text-lg md:text-xl text-[#D4AF37] max-w-2xl mx-auto leading-relaxed mt-6 mb-12">
          A Vallejo favorite since 2000 — freshly made, every morning.
        </p>

        {/* CTA Button */}
          <motion.button
        whileHover={{ y: -4 }}
        transition={{ duration: 0.10, ease: "easeOut" }}
        className="bg-[#C43B2F] text-white hover:text-[#D4AF37] font-semibold py-3 px-10 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl"
      >
        View Menu
      </motion.button>
      </motion.div>
    </section>
  );
}
