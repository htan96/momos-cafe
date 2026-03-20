"use client";

import { motion } from "framer-motion";
import { useAdminSettings, DEFAULT_SETTINGS } from "@/lib/useAdminSettings";

const MAPS_URL = "https://www.google.com/maps/place/1922+Broadway+St,+Vallejo,+CA+94589";

export default function LocationDetails() {
  const { settings } = useAdminSettings();
  const locationNote =
    settings?.locationNote ?? DEFAULT_SETTINGS.locationNote;

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.55 }}
    >
      <div className="bg-cream border border-cream-dark rounded-2xl overflow-hidden">
        <div className="bg-teal-dark px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b-2 border-gold">
          <h3 className="font-display text-2xl text-cream leading-none">
            Morgen&apos;s Kitchen
          </h3>
          <div className="inline-flex items-center gap-2 bg-[rgba(45,122,45,0.18)] border border-[rgba(45,122,45,0.35)] text-[#7ecf7e] font-semibold text-[11px] tracking-[0.15em] uppercase py-1.5 px-3.5 rounded-full">
            <span className="relative w-2 h-2 rounded-full bg-[#2d7a2d] animate-pulse" />
            Serving Now
          </div>
        </div>

        <div className="p-6 space-y-0">
          <div className="flex gap-3.5 py-3.5 border-b border-cream-dark">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-lg shadow-sm flex-shrink-0">
              📍
            </div>
            <div>
              <span className="font-semibold text-[10px] tracking-[0.2em] uppercase text-teal block mb-1">
                Address
              </span>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] font-medium text-charcoal hover:text-red transition-colors leading-snug"
              >
                1922 Broadway St
                <br />
                Vallejo, CA 94589
              </a>
              <span className="text-xs text-charcoal/50 block mt-1 font-medium tracking-wide">
                Same site as Morgen&apos;s Kitchen — outdoor order windows
              </span>
            </div>
          </div>

          <div className="flex gap-3.5 py-3.5 border-b border-cream-dark">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-lg shadow-sm flex-shrink-0">
              📞
            </div>
            <div>
              <span className="font-semibold text-[10px] tracking-[0.2em] uppercase text-teal block mb-1">
                Phone
              </span>
              <a
                href="tel:+17076547180"
                className="text-[15px] font-medium text-charcoal hover:text-red transition-colors"
              >
                (707) 654-7180
              </a>
              <span className="text-xs text-charcoal/50 block mt-1 font-medium tracking-wide">
                Call ahead for large orders
              </span>
            </div>
          </div>

          <div className="flex gap-3.5 py-3.5">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-lg shadow-sm flex-shrink-0">
              📸
            </div>
            <div>
              <span className="font-semibold text-[10px] tracking-[0.2em] uppercase text-teal block mb-1">
                Instagram
              </span>
              <a
                href="https://instagram.com/momoscafe"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] font-medium text-charcoal hover:text-red transition-colors"
              >
                @momoscafe
              </a>
              <span className="text-xs text-charcoal/50 block mt-1 font-medium tracking-wide">
                Menu updates &amp; daily specials
              </span>
            </div>
          </div>
        </div>

        {/* Pop-up notice — order-first, limited seating */}
        <div className="mx-6 mb-6 bg-[rgba(193,154,53,0.1)] border border-[rgba(193,154,53,0.3)] rounded-lg p-4 flex gap-2.5">
          <span className="text-lg flex-shrink-0 mt-0.5">ℹ️</span>
          <p className="text-[13px] text-charcoal/70 leading-relaxed font-medium tracking-wide">
            <strong className="text-charcoal">{locationNote}</strong>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
