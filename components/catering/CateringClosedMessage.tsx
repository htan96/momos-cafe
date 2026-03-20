"use client";

import Link from "next/link";

export default function CateringClosedMessage() {
  return (
    <div className="text-center py-8">
      <h3 className="font-display text-2xl text-charcoal mb-3 leading-none">
        Catering is currently unavailable
      </h3>
      <p className="text-charcoal/65 text-sm mb-6">
        Check back soon or reach out to us directly.
      </p>
      <a
        href="tel:+17076547180"
        className="inline-flex items-center justify-center font-semibold text-sm py-3 px-6 rounded-lg bg-red text-white shadow-[0_4px_0_#800] hover:opacity-90 transition-opacity"
      >
        Contact us directly
      </a>
    </div>
  );
}
