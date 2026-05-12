"use client";

import Link from "next/link";

interface OrderingClosedMessageProps {
  /** Custom headline when closed (e.g. time-based vs manual). Default: "Online ordering is currently unavailable" */
  message?: string;
}

export default function OrderingClosedMessage({ message }: OrderingClosedMessageProps) {
  const headline = message ?? "We’re not taking online orders right now";
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-5 py-20">
      <div className="max-w-[480px] w-full text-center">
        <div className="bg-white border border-cream-dark rounded-2xl p-10 md:p-12 shadow-[0_12px_48px_-28px_rgba(44,44,44,0.25)]">
          <span className="font-semibold text-[11px] tracking-[0.28em] uppercase text-teal-dark block mb-3">
            Ordering
          </span>
          <div className="flex items-center justify-center gap-4 my-4 opacity-80">
            <span className="flex-1 max-w-[80px] h-px bg-gradient-to-r from-transparent to-gold/80" />
            <span className="flex-1 max-w-[80px] h-px bg-gradient-to-l from-transparent to-gold/80" />
          </div>
          <h1 className="font-display text-[clamp(26px,5vw,34px)] leading-tight text-charcoal mb-3">{headline}</h1>
          <p className="text-[15px] text-charcoal/65 leading-relaxed mb-8">
            Thanks for thinking of us — we&apos;ll be here when the kitchen opens again. Until then, you can still browse the menu or shop for merch.
          </p>
          <Link
            href="/find-us"
            className="inline-flex items-center justify-center font-semibold text-sm tracking-wider uppercase py-3.5 px-7 rounded-xl bg-red text-white shadow-[0_4px_0_#800,0_6px_20px_rgba(200,39,45,0.22)] hover:opacity-90 transition-opacity"
          >
            Visit us in Vallejo
          </Link>
        </div>
      </div>
    </div>
  );
}
