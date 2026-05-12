"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  useAdminSettings,
  DEFAULT_SETTINGS,
  getHoursSummary,
  getIsOpenToday,
} from "@/lib/useAdminSettings";

export default function Hero() {
  const { settings } = useAdminSettings();
  const weeklyHours = settings?.weeklyHours ?? DEFAULT_SETTINGS.weeklyHours;
  const hoursSummary = getHoursSummary(weeklyHours);
  const isOpenToday = getIsOpenToday(settings);
  return (
    <section
      id="hero"
      className="relative bg-teal min-h-[92vh] flex items-center overflow-hidden"
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 70% 40%, rgba(74,139,140,0.3) 0%, transparent 60%), linear-gradient(180deg, #2f6d66 0%, #1a4a4a 100%)",
        }}
        aria-hidden
      />

      {/* Bridge SVG decoration */}
      <svg
        className="absolute top-0 -right-[5%] w-[65%] h-full opacity-[0.08] pointer-events-none"
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
        <line
          x1="230"
          y1="130"
          x2="230"
          y2="280"
          stroke="#8FC4C4"
          strokeWidth="1"
          opacity="0.7"
        />
        <line
          x1="270"
          y1="112"
          x2="270"
          y2="280"
          stroke="#8FC4C4"
          strokeWidth="1"
          opacity="0.7"
        />
        <line
          x1="310"
          y1="108"
          x2="310"
          y2="280"
          stroke="#8FC4C4"
          strokeWidth="1"
          opacity="0.7"
        />
        <line
          x1="350"
          y1="112"
          x2="350"
          y2="280"
          stroke="#8FC4C4"
          strokeWidth="1"
          opacity="0.7"
        />
        <line
          x1="390"
          y1="122"
          x2="390"
          y2="280"
          stroke="#8FC4C4"
          strokeWidth="1"
          opacity="0.7"
        />
        <line
          x1="430"
          y1="130"
          x2="430"
          y2="280"
          stroke="#8FC4C4"
          strokeWidth="1"
          opacity="0.7"
        />
        <line
          x1="470"
          y1="130"
          x2="470"
          y2="280"
          stroke="#8FC4C4"
          strokeWidth="1"
          opacity="0.7"
        />
        <line
          x1="510"
          y1="120"
          x2="510"
          y2="280"
          stroke="#8FC4C4"
          strokeWidth="1"
          opacity="0.7"
        />
        <line
          x1="550"
          y1="108"
          x2="550"
          y2="280"
          stroke="#8FC4C4"
          strokeWidth="1"
          opacity="0.7"
        />
        <rect
          x="185"
          y="88"
          width="38"
          height="22"
          rx="2"
          fill="none"
          stroke="#4A8B8C"
          strokeWidth="2"
        />
        <rect
          x="565"
          y="48"
          width="38"
          height="22"
          rx="2"
          fill="none"
          stroke="#4A8B8C"
          strokeWidth="2"
        />
        <line
          x1="0"
          y1="295"
          x2="800"
          y2="295"
          stroke="#4A8B8C"
          strokeWidth="3"
        />
      </svg>

      <div className="container max-w-[1140px] mx-auto px-5 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-[2] w-full pt-20 pb-28 md:pt-24 md:pb-32"
        >
          <div className="flex flex-wrap items-center gap-2 mb-7">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full py-1.5 pl-2 pr-4">
              <span
                className="w-2 h-2 rounded-full bg-gold animate-pulse"
                aria-hidden
              />
              <span className="font-medium text-xs tracking-[0.2em] uppercase text-white/90">
                Vallejo&apos;s Breakfast and Lunch Spot
              </span>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 font-semibold text-[11px] tracking-wider uppercase py-1.5 px-3.5 rounded-full ${
                isOpenToday
                  ? "text-[#2d7a2d] bg-white border border-teal/20"
                  : "text-white/70 bg-white/10 border border-white/15"
              }`}
            >
              {isOpenToday && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2d7a2d] animate-pulse" />
              )}
              {isOpenToday ? "Open Today" : "Closed Today"}
            </div>
          </div>

          <h1 className="font-display text-[clamp(52px,10vw,110px)] leading-[1.033] text-cream mb-3">
            <span className="block">Big Breakfast.</span>
            <span className="block text-red font-[1000] tracking-[-0.033em]">Bold Flavor.</span>
            <span className="block text-gold">Bay Area Soul.</span>
          </h1>

          <p className="text-[clamp(15px,2vw,18px)] text-white/75 max-w-[480px] leading-relaxed mt-5 mb-9">
            Hearty breakfast plates, loaded burritos,{" "}
            <strong className="text-aqua font-bold">stacked burgers</strong>,
            and Mexican-American comfort food — served fast, fresh, and with
            love in Vallejo.
          </p>

          <div className="flex gap-3.5 flex-wrap">
            <Link
              href="/menu"
              className="inline-flex items-center justify-center gap-2 font-semibold text-base tracking-wider uppercase py-4 px-8 rounded-lg bg-red text-white shadow-[0_4px_0_#800,0_6px_20px_rgba(200,39,45,0.35)] hover:opacity-90 hover:-translate-y-0.5 transition-all"
            >
              Order Now
            </Link>
            <Link
              href="#menu-preview"
              className="inline-flex items-center justify-center gap-2 font-semibold text-sm tracking-wider uppercase py-3.5 px-6 rounded-lg bg-transparent text-white border-2 border-white/70 hover:bg-white/15 transition-all"
            >
              View Full Menu
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 mt-11">
            {[
              hoursSummary === "Hours vary" || hoursSummary === "Closed"
                ? hoursSummary
                : `${hoursSummary} daily`,
              "Pickup and Delivery",
              "Cash and Card",
              "Family Portions",
            ].map((pill) => (
              <span
                key={pill}
                className="bg-white/5 border border-white/15 text-white/75 text-sm py-1.5 px-3.5 rounded-full"
              >
                ✓ {pill}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Food cards - hidden on mobile */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[420px] grid grid-cols-2 gap-6 p-5 z-[2] hidden lg:grid">
        {[
          { emoji: "🍳", title: "Breakfast Plates", desc: "Eggs, potatoes and more" },
          { emoji: "🌯", title: "Breakfast Burritos", desc: "Loaded and wrapped right" },
          { emoji: "🍔", title: "Burgers", desc: "Crispy, juicy, stacked" },
          { emoji: "🫔", title: "Mexican Plates", desc: "Authentic flavors" },
        ].map((card, i) => (
          <div
            key={card.title}
            className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center backdrop-blur-sm hover:-translate-y-1 transition-transform"
          >
            <span className="text-4xl block mb-2.5">{card.emoji}</span>
            <h4 className="font-semibold text-sm text-white/90">{card.title}</h4>
            <p className="text-xs text-white/50 mt-1">{card.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
