"use client";

import Link from "next/link";

interface OrderingClosedMessageProps {
  /** Custom headline when closed (e.g. time-based vs manual). Default: "Online ordering is currently unavailable" */
  message?: string;
}

export default function OrderingClosedMessage({ message }: OrderingClosedMessageProps) {
  const headline = message ?? "Online ordering is currently unavailable";
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-5 py-20">
      <div className="max-w-[480px] w-full text-center">
        <div className="bg-white border-2 border-cream-dark rounded-2xl p-10 md:p-12 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <span className="font-semibold text-[11px] tracking-[0.3em] uppercase text-teal block mb-4">
            Ordering
          </span>
          <div className="flex items-center justify-center gap-4 my-4">
            <span className="flex-1 max-w-[80px] h-[1.5px] bg-gold" />
            <span className="flex-1 max-w-[80px] h-[1.5px] bg-gold" />
          </div>
          <h1 className="font-display text-[clamp(28px,5vw,36px)] leading-tight text-charcoal mb-4">
            {headline}
          </h1>
          <p className="text-base text-charcoal/65 leading-relaxed mb-8">
            Come back again at 8 AM.
          </p>
          <Link
            href="/find-us"
            className="inline-flex items-center justify-center font-semibold text-base tracking-wider uppercase py-4 px-8 rounded-lg bg-red text-white shadow-[0_4px_0_#800,0_6px_20px_rgba(200,39,45,0.25)] hover:opacity-90 transition-opacity"
          >
            View Location
          </Link>
        </div>
      </div>
    </div>
  );
}
