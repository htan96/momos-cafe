"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  useAdminSettings,
  DEFAULT_SETTINGS,
  getTodayKey,
  formatDayHours,
  getIsOpenToday,
} from "@/lib/useAdminSettings";
import { useMapsUrl } from "@/lib/mapsUrl";
import {
  businessPhoneDisplay,
  businessPhoneTelHref,
  formatBusinessAddressOneLine,
} from "@/lib/businessLocation";

export default function Location() {
  const { settings } = useAdminSettings();
  const mapsUrl = useMapsUrl();
  const loc = settings?.businessLocation ?? DEFAULT_SETTINGS.businessLocation;
  const weeklyHours = settings?.weeklyHours ?? DEFAULT_SETTINGS.weeklyHours;
  const todayKey = getTodayKey(settings);
  const hoursDisplay = formatDayHours(weeklyHours[todayKey]);
  const isOpenToday = getIsOpenToday(settings);
  return (
    <section id="location" className="py-16 md:py-20 bg-white">
      <div className="container max-w-[1140px] mx-auto px-5">
        <div className="text-center mb-12">
          <span className="font-semibold text-xs tracking-[0.2em] uppercase text-teal">
            Find Us
          </span>
          <div className="flex items-center gap-4 my-2">
            <span className="flex-1 h-[1.5px] bg-gold" />
            <span className="flex-1 h-[1.5px] bg-gold" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl text-charcoal mt-2">
            Come Visit Us
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Link
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-cream/80 rounded-2xl h-[360px] flex flex-col items-center justify-center text-center border-2 border-cream/80 hover:border-aqua/30 transition-colors cursor-pointer"
            >
              <span className="text-6xl block mb-3">📍</span>
              <h4 className="font-display text-2xl text-teal mb-1.5">
                Momo&apos;s Café Vallejo
              </h4>
              <p className="text-sm text-charcoal/60 mb-5">
                Click to open in Maps
              </p>
              <span className="inline-flex items-center justify-center font-semibold text-sm py-2.5 px-5 rounded-lg bg-red text-white">
                Get Directions
              </span>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div
              className={`inline-flex items-center gap-1.5 font-semibold text-sm tracking-wider py-1 px-3.5 rounded-full mb-5 ${
                isOpenToday
                  ? "text-[#2d7a2d] bg-[#2d7a2d]/10"
                  : "text-charcoal/60 bg-charcoal/5"
              }`}
            >
              {isOpenToday && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2d7a2d] animate-pulse" />
              )}
              {isOpenToday ? "Open Today" : "Closed Today"}
            </div>
            <h3 className="font-display text-3xl text-charcoal mb-1.5">
              Hours and Info
            </h3>
            <p className="text-charcoal/60 leading-relaxed mb-7">
              Inside Morgen&apos;s Kitchen
              <br />
              {formatBusinessAddressOneLine(loc)}
              <br />
              <a href={businessPhoneTelHref(loc)} className="text-teal hover:underline">
                {businessPhoneDisplay(loc)}
              </a>
            </p>
            <p className="text-sm text-charcoal/65 mb-6">{hoursDisplay}</p>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/menu"
                className="inline-flex items-center justify-center font-semibold text-sm py-3 px-6 rounded-lg bg-red text-white hover:opacity-90 transition-opacity"
              >
                Order Ahead
              </Link>
              <a
                href={businessPhoneTelHref(loc)}
                className="inline-flex items-center justify-center font-semibold text-sm py-3 px-6 rounded-lg bg-transparent text-teal border-2 border-teal hover:bg-teal hover:text-white transition-colors"
              >
                Call Us
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
