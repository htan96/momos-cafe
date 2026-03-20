"use client";

import Link from "next/link";

export default function ShopComingSoon() {
  return (
    <main className="min-h-[70vh] bg-cream flex items-center justify-center px-5 py-20">
      <div className="max-w-[520px] w-full">
        <div className="bg-white border-2 border-cream-dark rounded-2xl p-10 md:p-12 shadow-[0_4px_20px_rgba(0,0,0,0.08)] text-center">
          <span className="font-semibold text-[11px] tracking-[0.3em] uppercase text-teal block mb-4">
            Shop
          </span>
          <div className="flex items-center justify-center gap-4 my-4">
            <span className="flex-1 max-w-[80px] h-[1.5px] bg-gold" />
            <span className="flex-1 max-w-[80px] h-[1.5px] bg-gold" />
          </div>
          <h1 className="font-display text-[clamp(36px,6vw,52px)] leading-tight text-charcoal mb-4">
            Shop Coming Soon
          </h1>
          <p className="text-base text-charcoal/65 leading-relaxed mb-2">
            We&apos;re getting Momo&apos;s merch ready for online ordering.
          </p>
          <p className="text-sm text-charcoal/50 mb-8">
            Check back soon.
          </p>
          <p className="text-sm text-charcoal/55 mb-8">
            In the meantime, grab your favorites from our menu.
          </p>
          <Link
            href="/menu"
            className="inline-flex items-center justify-center font-semibold text-base tracking-wider uppercase py-4 px-8 rounded-lg bg-red text-white shadow-[0_4px_0_#800,0_6px_20px_rgba(200,39,45,0.25)] hover:opacity-90 hover:-translate-y-0.5 transition-all"
          >
            View Menu
          </Link>
        </div>
      </div>
    </main>
  );
}
