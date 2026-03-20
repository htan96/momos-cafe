"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  useAdminSettings,
  DEFAULT_SETTINGS,
  getIsOpenToday,
} from "@/lib/useAdminSettings";

const BRIDGE_SVG = (
  <svg
    className="absolute top-0 -right-[5%] w-[65%] h-full opacity-[0.07] pointer-events-none"
    viewBox="0 0 800 400"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden
  >
    <path d="M0 300 Q200 120 400 160 Q600 200 800 80" stroke="#8FC4C4" strokeWidth="4" fill="none" />
    <path d="M0 320 Q200 140 400 180 Q600 220 800 100" stroke="#8FC4C4" strokeWidth="2" fill="none" />
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
);

export default function FindUsHero() {
  const { settings } = useAdminSettings();
  const locationNote =
    settings?.locationNote ?? DEFAULT_SETTINGS.locationNote;
  const weeklyHours = settings?.weeklyHours ?? DEFAULT_SETTINGS.weeklyHours;
  const isOpenToday = getIsOpenToday(weeklyHours);

  return (
    <section
      id="find-hero"
      className="relative bg-teal-dark min-h-[72vh] flex items-center overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 75% 65% at 68% 42%, rgba(74,139,140,0.28) 0%, transparent 60%), linear-gradient(175deg, #2D6B6B 0%, #1a4a4a 100%)",
        }}
        aria-hidden
      />
      {BRIDGE_SVG}

      <div className="container max-w-[1140px] mx-auto px-5 relative z-[2] w-full py-20 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex flex-wrap items-center gap-2 mb-7">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full py-1.5 pl-2 pr-4">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" aria-hidden />
              <span className="font-medium text-xs tracking-[0.2em] uppercase text-white/90">
                {locationNote}
              </span>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 font-semibold text-[11px] tracking-wider uppercase py-1.5 px-3.5 rounded-full ${
                isOpenToday
                  ? "text-[#2d7a2d] bg-white/20 border border-white/30"
                  : "text-white/70 bg-white/10 border border-white/15"
              }`}
            >
              {isOpenToday && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2d7a2d] animate-pulse" />
              )}
              {isOpenToday ? "Open Today" : "Closed Today"}
            </div>
          </div>

          <h1 className="font-display text-[clamp(58px,10vw,116px)] leading-[0.92] text-cream mb-3">
            <span className="block">Come</span>
            <span className="block text-red">Find Us.</span>
          </h1>

          <p className="text-[clamp(15px,2vw,18px)] text-white/75 max-w-[500px] leading-relaxed mt-5 mb-9">
            {locationNote}
          </p>

          <div className="flex gap-3.5 flex-wrap">
            <a
              href="https://www.google.com/maps/place/1922+Broadway+St,+Vallejo,+CA+94589"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center font-semibold text-base tracking-wider uppercase py-4 px-8 rounded-lg bg-red text-white shadow-[0_4px_0_#a01e23,0_6px_20px_rgba(200,39,45,0.35)] hover:opacity-90 hover:-translate-y-0.5 transition-all"
            >
              Get Directions
            </a>
            <Link
              href="/menu"
              className="inline-flex items-center justify-center font-semibold text-sm tracking-wider uppercase py-3.5 px-6 rounded-lg bg-transparent text-white border-2 border-white/70 hover:bg-white/15 transition-all"
            >
              Order Pickup →
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 mt-10">
            <span className="bg-white/5 border border-white/15 text-white/75 text-[13px] py-1.5 px-3.5 rounded-full">
              Order-first experience
            </span>
            <span className="bg-white/5 border border-white/15 text-white/75 text-[13px] py-1.5 px-3.5 rounded-full">
              1922 Broadway St, Vallejo
            </span>
            <span className="bg-white/5 border border-white/15 text-white/75 text-[13px] py-1.5 px-3.5 rounded-full">
              Patio seating available
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
