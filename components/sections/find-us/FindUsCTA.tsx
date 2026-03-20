"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useAdminSettings, DEFAULT_SETTINGS } from "@/lib/useAdminSettings";

const MAPS_URL = "https://www.google.com/maps/place/1922+Broadway+St,+Vallejo,+CA+94589";

const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.08 },
  transition: { duration: 0.55 },
};

export default function FindUsCTA() {
  const { settings } = useAdminSettings();
  const locationNote =
    settings?.locationNote ?? DEFAULT_SETTINGS.locationNote;
  const deliveryComingSoon =
    settings?.deliveryComingSoon ?? DEFAULT_SETTINGS.deliveryComingSoon;

  return (
    <>
      {/* Quick Actions */}
      <section id="quick-actions" className="py-20 bg-cream">
        <div className="container max-w-[1140px] mx-auto px-5">
          <motion.div
            {...fadeUp}
            className="text-center mb-12"
          >
            <span className="font-semibold text-[11px] tracking-[0.3em] uppercase text-teal block">
              Ready to Visit?
            </span>
            <div className="flex items-center gap-4 my-2">
              <div className="flex-1 h-[1.5px] bg-gold" />
              <div className="flex-1 h-[1.5px] bg-gold" />
            </div>
            <h2 className="font-display text-[clamp(38px,6vw,64px)] leading-none text-charcoal mt-2 mb-3">
              Your Next Move
            </h2>
            <p className="text-base text-charcoal/65 max-w-[500px] mx-auto leading-relaxed">
              Three ways to connect with us — pick whichever is fastest for you.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {/* Order Pickup — primary */}
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }}>
              <Link
                href="/menu"
                className="block bg-red border border-red rounded-2xl p-6 md:p-7 text-left shadow-[0_4px_0_#800,0_8px_32px_rgba(200,39,45,0.25)] hover:shadow-[0_2px_0_#800,0_12px_40px_rgba(200,39,45,0.3)] hover:-translate-y-1 transition-all"
              >
                <span className="text-4xl block mb-4">🍳</span>
                <span className="inline-block bg-white/20 text-white/90 font-semibold text-[10px] tracking-[0.2em] uppercase py-1 px-2.5 rounded mb-3">
                  Fastest
                </span>
                <h3 className="font-display text-[28px] leading-none text-white mb-2.5">
                  Order Pickup
                </h3>
                <p className="text-sm text-white/78 leading-relaxed flex-1">
                  Browse the full menu and place a pickup order. Ready in about 15 minutes — order first, then walk up to our outdoor windows.
                </p>
                <div className="mt-5 pt-4 border-t border-white/20 font-semibold text-xs tracking-wider uppercase text-white/80">
                  Order Now →
                </div>
              </Link>
            </motion.div>

            {/* Get Directions */}
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.16 }}>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white border border-cream-dark rounded-2xl p-6 md:p-7 text-left hover:border-teal-light hover:shadow-[0_6px_28px_rgba(74,139,140,0.15)] hover:-translate-y-0.5 transition-all"
              >
                <span className="text-4xl block mb-4">📍</span>
                <span className="inline-block bg-teal text-white font-semibold text-[10px] tracking-[0.2em] uppercase py-1 px-2.5 rounded mb-3">
                  Navigate
                </span>
                <h3 className="font-display text-[28px] leading-none text-charcoal mb-2.5">
                  Get Directions
                </h3>
                <p className="text-sm text-charcoal/60 leading-relaxed">
                  {locationNote} Parking lot plus street parking on Broadway and surrounding streets.
                </p>
                <div className="mt-5 pt-4 border-t border-cream-dark font-semibold text-xs tracking-wider uppercase text-teal">
                  Open in Maps →
                </div>
              </a>
            </motion.div>

            {/* Call Ahead */}
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.24 }}>
              <a
                href="tel:+17076547180"
                className="block bg-white border border-cream-dark rounded-2xl p-6 md:p-7 text-left hover:border-teal-light hover:shadow-[0_6px_28px_rgba(74,139,140,0.15)] hover:-translate-y-0.5 transition-all"
              >
                <span className="text-4xl block mb-4">📞</span>
                <span className="inline-block bg-teal text-white font-semibold text-[10px] tracking-[0.2em] uppercase py-1 px-2.5 rounded mb-3">
                  Talk to Us
                </span>
                <h3 className="font-display text-[28px] leading-none text-charcoal mb-2.5">
                  Call Ahead
                </h3>
                <p className="text-sm text-charcoal/60 leading-relaxed">
                  Have questions or need a larger order? Call us at <strong>(707) 654-7180</strong> and we&apos;ll get it sorted before you arrive.
                </p>
                <div className="mt-5 pt-4 border-t border-cream-dark font-semibold text-xs tracking-wider uppercase text-teal">
                  (707) 654-7180 →
                </div>
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Visit Notes */}
      <section id="visit-notes" className="pb-20 bg-cream">
        <div className="container max-w-[1140px] mx-auto px-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              ...(deliveryComingSoon
                ? [
                    {
                      icon: "🛵",
                      title: "Delivery Coming Soon",
                      desc: "We'll announce delivery on Instagram @momoscafe when it's available.",
                    },
                  ]
                : []),
              {
                icon: "🅿️",
                title: "Parking Lot & Street",
                desc: "Parking lot on site plus free street parking on Broadway and adjacent streets.",
              },
              {
                icon: "🪟",
                title: "Order Windows & Patio",
                desc: "Order at our windows outside, then grab a seat in the patio.",
              },
              {
                icon: "⏱️",
                title: "Ready in ~15 Min",
                desc: "Order online ahead of time to skip the wait entirely.",
              },
              {
                icon: "💳",
                title: "Cash & Card",
                desc: "We accept all major credit cards and cash. Apple Pay available.",
              },
              {
                icon: "🔜",
                title: "Permanent Location Coming",
                desc: "We're working on our next home in Vallejo. Follow us for updates.",
              },
              {
                icon: "📅",
                title: "Hours May Vary",
                desc: "Check @momoscafe on Instagram or call before visiting — hours can change.",
              },
            ].map((note, i) => (
              <motion.div
                key={note.title}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.55, delay: i * 0.05 }}
                className="bg-white border border-cream-dark rounded-2xl p-4 md:p-5 flex gap-3 hover:border-teal-light hover:shadow-[0_3px_14px_rgba(74,139,140,0.1)] transition-all"
              >
                <span className="text-2xl flex-shrink-0 mt-0.5">{note.icon}</span>
                <div>
                  <h4 className="font-semibold text-[13px] text-charcoal mb-1 tracking-wide">
                    {note.title}
                  </h4>
                  <p className="text-[12.5px] text-charcoal/55 leading-relaxed">
                    {note.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section
        id="find-closing"
        className="py-20 bg-teal-dark relative overflow-hidden"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(74,139,140,0.4) 0%, transparent 70%)",
          }}
          aria-hidden
        />
        <div className="container max-w-[1140px] mx-auto px-5 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.55 }}
            className="text-center max-w-[680px] mx-auto"
          >
            <span className="font-semibold text-[11px] tracking-[0.3em] uppercase text-gold block">
              Vallejo&apos;s Café
            </span>
            <div className="flex items-center gap-4 my-2 max-w-[320px] mx-auto">
              <div className="flex-1 h-[1.5px] bg-gold/45" />
              <div className="flex-1 h-[1.5px] bg-gold/45" />
            </div>
            <h2 className="font-display text-[clamp(44px,7vw,72px)] leading-[0.95] text-cream mt-3 mb-5">
              We&apos;re Still Here.
              <span className="block text-gold">Come Eat.</span>
            </h2>
            <p className="text-[17px] text-white/70 leading-relaxed mb-9">
              The address changed. The food didn&apos;t.
              <strong className="text-teal-light"> Same kitchen, same portions</strong>, same Momo&apos;s that Vallejo has been coming back to for over 25 years.
            </p>
            <div className="flex gap-3.5 flex-wrap justify-center">
              <Link
                href="/menu"
                className="inline-flex items-center justify-center font-semibold text-base tracking-wider uppercase py-4 px-8 rounded-lg bg-red text-white shadow-[0_4px_0_#800,0_6px_20px_rgba(200,39,45,0.35)] hover:opacity-90 transition-all"
              >
                🍳 Order Pickup Now
              </Link>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center font-semibold text-[15px] tracking-wider uppercase py-3.5 px-7 rounded-lg bg-transparent text-white border-2 border-white/70 hover:bg-white/15 transition-all"
              >
                📍 Get Directions
              </a>
            </div>

            <div className="flex items-center justify-center gap-3.5 mt-9 pt-7 border-t border-white/10 flex-wrap">
              <a
                href="https://instagram.com/momoscafe"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-white/75 font-semibold text-xs tracking-wider uppercase py-2 px-4 rounded-full hover:bg-white/15 hover:text-white transition-all"
              >
                📸 @momoscafe
              </a>
              <a
                href="tel:+17076547180"
                className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-white/75 font-semibold text-xs tracking-wider uppercase py-2 px-4 rounded-full hover:bg-white/15 hover:text-white transition-all"
              >
                📞 (707) 654-7180
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
