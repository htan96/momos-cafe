"use client";

import Link from "next/link";

/**
 * Keeps Shop visually distinct from same-day food ordering — primes fulfillment expectation.
 */
export default function ShopFlowRibbon() {
  return (
    <div className="border-y border-cream-dark bg-cream-mid/80 backdrop-blur-sm">
      <div className="container max-w-[1200px] mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[13px]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold text-teal-dark uppercase tracking-[0.12em] text-[10px]">
            Momo&apos;s Shop
          </span>
          <span className="hidden sm:inline text-charcoal/30">·</span>
          <span className="text-charcoal/75">
            Retail merch is{" "}
            <strong className="text-charcoal font-semibold">made to order</strong>
            {" "}— typically{" "}
            <strong className="text-charcoal font-semibold">2–3 business days</strong>{" "}
            before pickup.
          </span>
        </div>
        <Link
          href="/menu"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto font-semibold text-teal-dark text-xs uppercase tracking-wider hover:text-teal shrink-0"
        >
          <span className="text-red">▸</span> Need food today? Order pickup
        </Link>
      </div>
    </div>
  );
}
