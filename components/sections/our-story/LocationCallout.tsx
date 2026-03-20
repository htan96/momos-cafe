"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  useAdminSettings,
  DEFAULT_SETTINGS,
  DAY_ORDER,
  formatDayHours,
} from "@/lib/useAdminSettings";

const DAY_LABELS: Record<string, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

export default function LocationCallout() {
  const { settings } = useAdminSettings();
  const weeklyHours = settings?.weeklyHours ?? DEFAULT_SETTINGS.weeklyHours;
  return (
    <section id="find-us" className="py-20 md:py-24 bg-white">
      <div className="container max-w-[1140px] mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="font-semibold text-xs tracking-[0.2em] uppercase text-teal">
            We&apos;re Still Cooking
          </span>
          <div className="flex items-center justify-center gap-4 my-2">
            <span className="flex-1 max-w-[120px] h-[1.5px] bg-gold" />
            <span className="flex-1 max-w-[120px] h-[1.5px] bg-gold" />
          </div>
          <h2 className="font-display text-[clamp(38px,6vw,64px)] leading-none text-charcoal mt-2 mb-3">
            Where to Find Us Now
          </h2>
          <p className="text-base text-charcoal/65 max-w-[500px] mx-auto leading-relaxed">
            We&apos;re operating out of Morgen&apos;s Kitchen while we work toward our next permanent home. Come eat.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          {/* Map placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Link
              href="https://www.google.com/maps/place/1922+Broadway+St,+Vallejo,+CA+94589"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-cream-dark rounded-2xl h-[320px] flex flex-col items-center justify-center text-center border-2 border-cream-dark hover:border-teal-light transition-colors cursor-pointer"
            >
              <span className="text-5xl block mb-3">📍</span>
              <h4 className="font-display text-2xl text-teal-dark mb-1.5">
                Morgen&apos;s Kitchen
              </h4>
              <p className="text-sm text-charcoal/60 mb-5">
                Vallejo, CA — Click to open in Maps
              </p>
              <span className="inline-flex items-center justify-center font-semibold text-sm py-2.5 px-5 rounded-lg bg-red text-white">
                Get Directions →
              </span>
            </Link>
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            <div className="inline-flex items-center gap-1.5 font-semibold text-xs tracking-wider text-[#2d7a2d] bg-[#2d7a2d]/10 py-1.5 px-3.5 rounded-full mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2d7a2d] animate-pulse" />
              Serving Now
            </div>
            <h3 className="font-display text-3xl md:text-4xl text-charcoal leading-none mb-1.5">
              Morgen&apos;s Kitchen
              <br />
              <span className="text-teal-dark text-2xl md:text-[26px]">Vallejo, CA</span>
            </h3>

            <p className="text-[15px] text-charcoal/65 mt-4 mb-1.5">
              📍 <strong className="text-charcoal">Address:</strong>{" "}
              <a href="https://www.google.com/maps/place/1922+Broadway+St,+Vallejo,+CA+94589" className="text-teal-dark hover:underline">
                1922 Broadway St, Vallejo, CA 94589
              </a>
            </p>
            <p className="text-[15px] text-charcoal/65 mb-1.5">
              📞 <strong className="text-charcoal">Phone:</strong>{" "}
              <a href="tel:+17076547180" className="text-teal-dark hover:underline">
                (707) 654-7180
              </a>
            </p>

            <table className="w-full border-collapse mt-6 mb-6">
              <tbody>
                {DAY_ORDER.map((key) => (
                  <tr key={key} className="border-b border-cream-dark">
                    <td className="py-2.5 font-semibold text-charcoal text-sm">
                      {DAY_LABELS[key]}
                    </td>
                    <td className="py-2.5 text-right text-charcoal/60 text-sm">
                      {formatDayHours(weeklyHours[key])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex gap-3 flex-wrap">
              <Link
                href="/menu"
                className="inline-flex items-center justify-center font-semibold text-sm py-3 px-6 rounded-lg bg-red text-white hover:opacity-90 transition-opacity"
              >
                Order Pickup
              </Link>
              <a
                href="tel:+17076547180"
                className="inline-flex items-center justify-center font-semibold text-sm py-3 px-6 rounded-lg bg-transparent text-teal-dark border-2.5 border-teal hover:bg-teal hover:text-white transition-colors"
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
