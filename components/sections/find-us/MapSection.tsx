"use client";

import { motion } from "framer-motion";

const MAPS_URL = "https://www.google.com/maps/place/1922+Broadway+St,+Vallejo,+CA+94589";
const MAP_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3139.337235146166!2d-122.26161732335705!3d38.11783099827836!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808512f7a26e63b3%3A0xb7d5d9e15dca983a!2s1922%20Broadway%20St%2C%20Vallejo%2C%20CA%2094589!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus";

export default function MapSection() {
  return (
    <section id="map-section" className="pb-20 bg-white">
      <div className="container max-w-[1140px] mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.55, delay: 0.16 }}
          className="rounded-2xl overflow-hidden border-2 border-cream-dark shadow-[0_4px_24px_rgba(0,0,0,0.1)] hover:border-teal-light transition-colors relative"
        >
          {/* Branded overlay — covers generic Google card, shows Momo's context */}
          <div className="absolute top-4 left-4 right-4 sm:right-auto sm:max-w-[280px] z-10 bg-teal-dark rounded-xl px-4 py-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.25)] border border-white/10">
            <div className="flex items-start gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse flex-shrink-0 mt-1" aria-hidden />
              <div>
                <p className="font-display text-lg text-cream leading-tight">
                  Momo&apos;s Café
                </p>
                <p className="text-cream/90 text-sm font-medium mt-0.5">
                  at Morgen&apos;s Kitchen
                </p>
                <p className="text-cream/75 text-[13px] mt-2">
                  1922 Broadway St, Vallejo, CA 94589
                </p>
                <p className="text-cream/60 text-xs mt-1.5">
                  Parking lot • Patio seating • Order at outdoor windows
                </p>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-gold font-semibold text-xs tracking-wider uppercase hover:text-cream transition-colors"
                >
                  Get Directions →
                </a>
              </div>
            </div>
          </div>
          <iframe
            src={MAP_EMBED_URL}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Momo's Café — 1922 Broadway St, Vallejo CA (Morgen's Kitchen site)"
            className="w-full h-[420px] md:h-[360px] block border-0"
          />
        </motion.div>
      </div>
    </section>
  );
}
