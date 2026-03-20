"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.08 },
  transition: { duration: 0.55 },
};

export default function ShopCTA() {
  return (
    <>
      {/* Cross-sell strip */}
      <section
        id="crosssell-strip"
        className="py-16 bg-teal-dark relative overflow-hidden"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(74,139,140,0.4) 0%, transparent 70%)",
          }}
          aria-hidden
        />
        <div className="container max-w-[1140px] mx-auto px-5 relative z-10">
          <motion.div
            {...fadeUp}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 text-center md:text-left"
          >
            <div>
              <h2 className="font-display text-[clamp(32px,5vw,52px)] leading-none text-cream mb-2.5">
                Hungry? <span className="text-gold">We&apos;ve Got You.</span>
              </h2>
              <p className="text-base text-white/68 leading-relaxed max-w-[460px] mx-auto md:mx-0">
                Order breakfast or lunch for pickup — same big portions, same Vallejo flavor. Ready in about 15 minutes.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap justify-center md:justify-end flex-shrink-0">
              <Link
                href="/menu"
                className="inline-flex items-center justify-center font-semibold text-[15px] tracking-wider uppercase py-3.5 px-7 rounded-lg bg-red text-white shadow-[0_4px_0_#800,0_6px_20px_rgba(200,39,45,0.35)] hover:opacity-90 transition-all"
              >
                🍳 Order Pickup →
              </Link>
              <Link
                href="/find-us"
                className="inline-flex items-center justify-center font-semibold text-[14px] tracking-wider uppercase py-3 px-6 rounded-lg bg-transparent text-white border-2 border-white/70 hover:bg-white/15 transition-all"
              >
                Find Us Today
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Community message */}
      <section id="shop-message" className="py-20 bg-cream">
        <div className="container max-w-[1140px] mx-auto px-5">
          <motion.div
            {...fadeUp}
            className="max-w-[720px] mx-auto text-center"
          >
            <span className="font-semibold text-[11px] tracking-[0.3em] uppercase text-teal block mb-2">
              More Than Merch
            </span>
            <div className="flex items-center gap-4 my-2 max-w-[300px] mx-auto">
              <div className="flex-1 h-[1.5px] bg-gold" />
              <div className="flex-1 h-[1.5px] bg-gold" />
            </div>
            <h2 className="font-display text-[clamp(26px,4vw,40px)] leading-tight text-charcoal mt-4 mb-5">
              Every purchase helps us
              <br />
              serve <span className="text-gold">community, comfort,</span>
              <br />
              and connection.
            </h2>
            <p className="text-base text-charcoal/65 leading-relaxed mb-8">
              Just like we do at the window — every morning, every day.
              When you buy from the shop, you&apos;re helping a 25-year-old family business
              keep doing what it loves.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <a
                href="https://instagram.com/momoscafe"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white border border-cream-dark text-charcoal font-semibold text-xs tracking-wider uppercase py-2 px-4 rounded-full hover:border-teal-light hover:shadow-[0_2px_10px_rgba(74,139,140,0.12)] transition-all"
              >
                📸 @momoscafe
              </a>
              <a
                href="tel:+17076547180"
                className="inline-flex items-center gap-2 bg-white border border-cream-dark text-charcoal font-semibold text-xs tracking-wider uppercase py-2 px-4 rounded-full hover:border-teal-light hover:shadow-[0_2px_10px_rgba(74,139,140,0.12)] transition-all"
              >
                📞 (707) 654-7180
              </a>
              <Link
                href="/our-story"
                className="inline-flex items-center gap-2 bg-white border border-cream-dark text-charcoal font-semibold text-xs tracking-wider uppercase py-2 px-4 rounded-full hover:border-teal-light hover:shadow-[0_2px_10px_rgba(74,139,140,0.12)] transition-all"
              >
                📖 Our Story
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
