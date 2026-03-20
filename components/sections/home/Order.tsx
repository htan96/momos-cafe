"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useAdminSettings, DEFAULT_SETTINGS } from "@/lib/useAdminSettings";

export default function Order() {
  const { settings } = useAdminSettings();
  const deliveryComingSoon =
    settings?.deliveryComingSoon ?? DEFAULT_SETTINGS.deliveryComingSoon;
  return (
    <section id="order" className="py-16 md:py-20">
      <div className="container max-w-[1140px] mx-auto px-5">
        <div className="text-center mb-12">
          <span className="font-semibold text-xs tracking-[0.2em] uppercase text-teal">
            Skip the Wait
          </span>
          <div className="flex items-center gap-4 my-2">
            <span className="flex-1 h-[1.5px] bg-gold" />
            <span className="flex-1 h-[1.5px] bg-gold" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl text-charcoal mt-2 mb-3">
            Order Your Way
          </h2>
          <p className="text-charcoal/65 max-w-[500px] mx-auto">
            Pickup is always fastest — but we deliver too.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl p-8 md:p-10 bg-red shadow-[0_8px_0_#800,0_20px_60px_rgba(200,39,45,0.3)]"
          >
            <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 text-white font-semibold text-xs tracking-wider uppercase py-1 px-3 rounded-full mb-5">
              ⭐ Recommended
            </span>
            <span className="text-5xl block mb-4">🏃</span>
            <h3 className="font-display text-3xl md:text-4xl text-white leading-tight mb-2">
              Pickup
            </h3>
            <p className="text-white/75 leading-relaxed mb-6">
              Order ahead online, walk in, grab your bag, and go. No waiting, no
              fuss.
            </p>
            <ul className="space-y-2 mb-7">
              {[
                "Pick your items online",
                "Choose your pickup time",
                "Walk in and grab your bag",
              ].map((step, i) => (
                <li
                  key={step}
                  className="flex items-center gap-3 font-medium text-sm text-white/85 py-2 border-b border-white/10"
                >
                  <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
            <Link
              href="/menu"
              className="inline-flex items-center justify-center font-semibold text-base py-3.5 px-7 rounded-lg bg-white text-red hover:bg-cream transition-colors"
            >
              Order Pickup Now
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl p-8 md:p-10 bg-cream/80 border-2 border-cream/80"
          >
            <span className="text-5xl block mb-4">🛵</span>
            <h3 className="font-display text-3xl md:text-4xl text-charcoal leading-tight mb-2">
              Delivery
            </h3>
            {deliveryComingSoon ? (
              <p className="text-charcoal/60 leading-relaxed mb-6">
                Delivery coming soon — we&apos;ll announce it on Instagram
                @momoscafe.
              </p>
            ) : (
              <>
                <p className="text-charcoal/60 leading-relaxed mb-6">
                  Too comfortable to move? Order on DoorDash or Uber Eats and we
                  will bring Momo&apos;s to your door.
                </p>
                <ul className="space-y-2 mb-7">
                  {[
                    "Open your delivery app",
                    "Search Momo's Cafe Vallejo",
                    "Your food comes to you",
                  ].map((step, i) => (
                    <li
                      key={step}
                      className="flex items-center gap-3 font-medium text-sm text-charcoal/70 py-2 border-b border-black/5"
                    >
                      <span className="w-6 h-6 rounded-full bg-teal flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-3 flex-wrap">
                  <a
                    href="https://www.doordash.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center font-semibold text-sm py-2.5 px-5 rounded-lg bg-red text-white hover:opacity-90 transition-opacity"
                  >
                    DoorDash
                  </a>
                  <a
                    href="https://www.ubereats.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center font-semibold text-sm py-2.5 px-5 rounded-lg bg-transparent text-teal border-2 border-teal hover:bg-teal hover:text-white transition-colors"
                  >
                    Uber Eats
                  </a>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
