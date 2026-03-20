"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function OurStoryHero() {
  return (
    <section
      id="story-hero"
      className="relative bg-teal-dark min-h-[88vh] flex items-center overflow-hidden"
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 65% 40%, rgba(74,139,140,0.25) 0%, transparent 60%), linear-gradient(180deg, #2D6B6B 0%, #1a4a4a 100%)",
        }}
        aria-hidden
      />

      {/* Bridge watermark */}
      <svg
        className="absolute top-0 -right-[5%] w-[65%] h-full opacity-[0.07] pointer-events-none"
        viewBox="0 0 800 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <path
          d="M0 300 Q200 120 400 160 Q600 200 800 80"
          stroke="#8FC4C4"
          strokeWidth="4"
          fill="none"
        />
        <path
          d="M0 320 Q200 140 400 180 Q600 220 800 100"
          stroke="#8FC4C4"
          strokeWidth="2"
          fill="none"
        />
        <rect x="190" y="100" width="28" height="200" fill="#4A8B8C" />
        <rect x="570" y="60" width="28" height="240" fill="#4A8B8C" />
        <line x1="230" y1="130" x2="230" y2="280" stroke="#8FC4C4" strokeWidth="1" opacity="0.7" />
        <line x1="270" y1="112" x2="270" y2="280" stroke="#8FC4C4" strokeWidth="1" opacity="0.7" />
        <line x1="310" y1="108" x2="310" y2="280" stroke="#8FC4C4" strokeWidth="1" opacity="0.7" />
        <line x1="350" y1="112" x2="350" y2="280" stroke="#8FC4C4" strokeWidth="1" opacity="0.7" />
        <line x1="390" y1="122" x2="390" y2="280" stroke="#8FC4C4" strokeWidth="1" opacity="0.7" />
        <line x1="430" y1="130" x2="430" y2="280" stroke="#8FC4C4" strokeWidth="1" opacity="0.7" />
        <line x1="470" y1="130" x2="470" y2="280" stroke="#8FC4C4" strokeWidth="1" opacity="0.7" />
        <line x1="510" y1="120" x2="510" y2="280" stroke="#8FC4C4" strokeWidth="1" opacity="0.7" />
        <line x1="550" y1="108" x2="550" y2="280" stroke="#8FC4C4" strokeWidth="1" opacity="0.7" />
        <rect x="185" y="88" width="38" height="22" rx="2" fill="none" stroke="#4A8B8C" strokeWidth="2" />
        <rect x="565" y="48" width="38" height="22" rx="2" fill="none" stroke="#4A8B8C" strokeWidth="2" />
        <line x1="0" y1="295" x2="800" y2="295" stroke="#4A8B8C" strokeWidth="3" />
      </svg>

      <div className="container max-w-[1140px] mx-auto px-5 relative z-[2] w-full py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full py-1.5 pl-2 pr-4 mb-7">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" aria-hidden />
            <span className="font-medium text-xs tracking-[0.2em] uppercase text-white/90">
              Vallejo, California — Since 2000
            </span>
          </div>

          <h1 className="font-display text-[clamp(54px,10vw,112px)] leading-[0.92] text-cream mb-3">
            <span className="block">25 Years.</span>
            <span className="block text-red">One Fire.</span>
            <span className="block text-gold">Still Here.</span>
          </h1>

          <p className="text-[clamp(15px,2vw,18px)] text-white/75 max-w-[520px] leading-relaxed mt-5 mb-9">
            Momo&apos;s Café wasn&apos;t built overnight. It was built by a father who started washing dishes
            and never stopped working — through{" "}
            <strong className="text-teal-light font-bold">three locations, two decades</strong>,
            and a fire that could have ended it all.
          </p>

          <div className="flex gap-3.5 flex-wrap">
            <Link
              href="/menu"
              className="inline-flex items-center justify-center gap-2 font-semibold text-base tracking-wider uppercase py-4 px-8 rounded-lg bg-red text-white shadow-[0_4px_0_#a01e23,0_6px_20px_rgba(200,39,45,0.35)] hover:opacity-90 hover:-translate-y-0.5 transition-all"
            >
              Order Now
            </Link>
            <Link
              href="#timeline"
              className="inline-flex items-center justify-center gap-2 font-semibold text-sm tracking-wider uppercase py-3.5 px-6 rounded-lg bg-transparent text-white border-2 border-white/70 hover:bg-white/15 transition-all"
            >
              Read the Story ↓
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-2 mt-12 pt-10 border-t border-white/10">
            <div className="flex flex-col gap-0.5">
              <span className="font-display text-4xl text-gold leading-none">25+</span>
              <span className="font-semibold text-[11px] tracking-[0.2em] uppercase text-white/55">
                Years Serving Vallejo
              </span>
            </div>
            <div className="flex flex-col gap-0.5 border-l border-white/10 pl-5">
              <span className="font-display text-4xl text-gold leading-none">3</span>
              <span className="font-semibold text-[11px] tracking-[0.2em] uppercase text-white/55">
                Locations Over Time
              </span>
            </div>
            <div className="flex flex-col gap-0.5 border-l border-white/10 pl-5">
              <span className="font-display text-4xl text-gold leading-none">1</span>
              <span className="font-semibold text-[11px] tracking-[0.2em] uppercase text-white/55">
                Family Behind It All
              </span>
            </div>
            <div className="flex flex-col gap-0.5 border-l border-white/10 pl-5">
              <span className="font-display text-4xl text-gold leading-none">0</span>
              <span className="font-semibold text-[11px] tracking-[0.2em] uppercase text-white/55">
                Times We Quit
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Desktop image card */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[44%] max-w-[500px] p-5 z-[2] hidden lg:block">
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="aspect-[4/3] bg-gradient-to-br from-teal/40 to-teal-dark/60 flex items-center justify-center relative">
            <span className="text-8xl">🍳</span>
            <span className="absolute bottom-5 left-1/2 -translate-x-1/2 font-display text-xl tracking-[0.2em] text-white/40">
              Est. 2000
            </span>
          </div>
          <div className="flex items-center gap-2.5 p-5">
            <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
            <span className="font-medium text-xs text-white/65 tracking-wide">
              Momo&apos;s Café — Vallejo&apos;s Breakfast &amp; Lunch Institution
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
