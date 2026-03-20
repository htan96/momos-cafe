"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function FireCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="pb-14 relative"
    >
      {/* Connector line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gold" />
      <div
        className="relative overflow-hidden rounded-2xl p-10 md:p-10 border-2 border-red/30 bg-charcoal shadow-[0_8px_0_rgba(0,0,0,0.2),0_20px_60px_rgba(0,0,0,0.25)]"
        style={{
          backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(200,39,45,0.04) 40px, rgba(200,39,45,0.04) 80px)`,
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div className="flex-1 min-w-0">
            <span className="inline-block font-semibold text-[11px] tracking-[0.2em] uppercase bg-red text-white py-1 px-3 rounded mb-4">
              🔥 The Hardest Chapter
            </span>
            <span className="font-semibold text-[11px] tracking-[0.2em] uppercase text-white/40 block mb-2.5">
              2025 — Georgia Street
            </span>
            <div className="font-display text-[clamp(32px,5vw,52px)] text-white leading-none mb-4">
              A Fire Shut the Doors.
            </div>
            <p className="text-[15px] text-white/70 leading-relaxed max-w-[440px]">
              In 2025, a fire tore through the Georgia Street location.
              <strong className="text-white font-bold"> Overnight, the doors closed.</strong>
              Twenty-plus years of work — the equipment, the space, the rhythm of the kitchen — stopped.
            </p>
            <p className="text-[15px] text-white/70 leading-relaxed max-w-[440px] mt-3">
              It wasn&apos;t planned. There was no soft close, no farewell plate.
              Just the reality of what fire does, and the question of what comes next.
            </p>
          </div>
          <div className="flex-shrink-0 bg-white/5 border border-white/10 rounded-2xl p-6 md:p-7 text-center min-w-[160px]">
            <span className="font-display text-5xl md:text-[56px] text-red leading-none block mb-1">
              13
            </span>
            <span className="font-semibold text-[11px] tracking-[0.2em] uppercase text-white/45">
              Years at
              <br />
              Georgia Street
            </span>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-white/5 font-display text-2xl md:text-[28px] text-cream leading-tight max-w-[500px]">
          &quot;Twenty years in, and the work wasn&apos;t done.
          <br />
          Momo&apos;s doesn&apos;t close — it adapts.&quot;
        </div>
      </div>
    </motion.div>
  );
}

export function ComebackCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="pb-2 relative"
    >
      {/* Connector line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gold" />
      <div className="relative overflow-hidden rounded-2xl p-10 bg-teal-dark shadow-[0_8px_0_rgba(0,0,0,0.15),0_20px_60px_rgba(45,107,107,0.25)]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 70% 70% at 80% 50%, rgba(74,139,140,0.25) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-10 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <span className="inline-block font-semibold text-[11px] tracking-[0.2em] uppercase bg-gold text-charcoal py-1 px-3 rounded mb-4">
              ✦ Current Chapter
            </span>
            <span className="font-semibold text-[11px] tracking-[0.2em] uppercase text-white/40 block mb-2.5">
              2025–Present — Morgen&apos;s Kitchen, Vallejo
            </span>
            <div className="font-display text-[clamp(30px,4vw,46px)] text-cream leading-none mb-3.5">
              The Pop-Up Era. The Comeback in Progress.
            </div>
            <p className="text-[15px] text-white/70 leading-relaxed">
              Momo&apos;s reopened inside <strong className="text-teal-light">Morgen&apos;s Kitchen</strong> — not as a defeat, but as a move forward.
              The menu is real, the kitchen is running, and the community that showed up after the fire
              is being fed again. A permanent new location is in the works.
              This chapter isn&apos;t the ending — it&apos;s the setup for what comes next.
            </p>
          </div>
          <div className="flex-shrink-0 flex flex-col gap-3 items-start">
            <Link
              href="/menu"
              className="inline-flex items-center justify-center font-semibold text-[15px] tracking-wider uppercase py-3.5 px-7 rounded-lg bg-red text-white shadow-[0_4px_0_#800] hover:opacity-90 transition-opacity"
            >
              Order Now
            </Link>
            <Link
              href="#find-us"
              className="inline-flex items-center justify-center font-semibold text-sm tracking-wider uppercase py-3 px-6 rounded-lg bg-transparent text-white border-2 border-white/70 hover:bg-white/15 transition-all"
            >
              Find Us Today →
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
