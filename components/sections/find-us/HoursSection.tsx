"use client";

import { motion } from "framer-motion";
import {
  useAdminSettings,
  DEFAULT_SETTINGS,
  DAY_ORDER,
  getTodayKey,
  formatDayHours,
  getIsOpenToday,
} from "@/lib/useAdminSettings";

const MAPS_URL = "https://www.google.com/maps/place/1922+Broadway+St,+Vallejo,+CA+94589";

const DAY_LABELS: Record<(typeof DAY_ORDER)[number], string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

export default function HoursSection() {
  const { settings } = useAdminSettings();
  const weeklyHours = settings?.weeklyHours ?? DEFAULT_SETTINGS.weeklyHours;
  const isOpenToday = getIsOpenToday(weeklyHours);
  const todayKey = getTodayKey();

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.55, delay: 0.08 }}
    >
      <div className="bg-cream border border-cream-dark rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-cream-dark flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-display text-2xl text-charcoal leading-none">
            Hours
          </h3>
          <div
            className={`inline-flex items-center gap-1.5 font-semibold text-[11px] tracking-[0.12em] uppercase py-1.5 px-3.5 rounded-full ${
              isOpenToday
                ? "text-[#2d7a2d] bg-[rgba(45,122,45,0.1)]"
                : "text-charcoal/50 bg-charcoal/5"
            }`}
          >
            {isOpenToday && <span className="w-1.5 h-1.5 rounded-full bg-[#2d7a2d] animate-pulse" />}
            {isOpenToday ? "Open Today" : "Closed Today"}
          </div>
        </div>

        <div className="px-6 py-2">
          <table className="w-full border-collapse">
            <tbody>
              {DAY_ORDER.map((key) => {
                const isToday = key === todayKey;
                const dayHours = weeklyHours[key];
                const display = formatDayHours(dayHours);
                return (
                  <tr
                    key={key}
                    className={isToday ? "text-teal-dark" : ""}
                  >
                    <td
                      className={`py-2.5 border-b border-cream-dark text-[14.5px] font-semibold tracking-wide ${
                        isToday ? "text-red font-bold" : "text-charcoal"
                      }`}
                    >
                      {DAY_LABELS[key]}
                    </td>
                    <td className="py-2.5 border-b border-cream-dark text-right text-[14.5px] text-charcoal/65">
                      {display}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="px-6 pb-5 text-xs text-charcoal/45 font-medium tracking-wide flex items-center gap-1.5">
          🕗 Hours may vary — check @momoscafe on Instagram or call before visiting.
        </p>

        <div className="px-6 py-4 border-t border-cream-dark bg-cream-mid flex gap-2.5 flex-wrap">
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center font-semibold text-[13px] tracking-wider uppercase py-2.5 px-5 rounded-lg bg-red text-white shadow-[0_4px_0_#800,0_6px_20px_rgba(200,39,45,0.35)] hover:opacity-90 transition-all flex-1 min-w-[140px]"
          >
            📍 Get Directions
          </a>
          <a
            href="tel:+17076547180"
            className="inline-flex items-center justify-center font-semibold text-[13px] tracking-wider uppercase py-2.5 px-5 rounded-lg bg-transparent text-teal-dark border-2.5 border-teal hover:bg-teal hover:text-white transition-all flex-1 min-w-[120px]"
          >
            📞 Call Us
          </a>
        </div>
      </div>
    </motion.div>
  );
}
