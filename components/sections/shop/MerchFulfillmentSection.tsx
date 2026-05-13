"use client";

export default function MerchFulfillmentSection() {
  return (
    <section
      className="py-14 md:py-18 bg-gradient-to-b from-cream to-cream-mid border-t border-cream-dark"
      aria-labelledby="merch-fulfillment-heading"
    >
      <div className="container max-w-[900px] mx-auto px-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-dark text-center mb-2">
          How Momo&apos;s Shop works
        </p>
        <h2
          id="merch-fulfillment-heading"
          className="font-display text-[clamp(26px,5vw,38px)] text-charcoal text-center leading-tight mb-8"
        >
          Food orders move fast.
          <span className="text-teal-dark"> Merch takes a beat.</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-5 md:gap-6">
          <article className="rounded-2xl bg-white border border-cream-dark p-5 md:p-6 shadow-[0_4px_0_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 rounded-full bg-red/15 items-center justify-center text-[11px] font-bold text-red">
                F
              </span>
              <h3 className="font-semibold text-charcoal text-sm uppercase tracking-wider">
                Order pickup (food)
              </h3>
            </div>
            <p className="text-[13px] text-charcoal/70 leading-relaxed mb-3">
              Cooked to order for same-day pickup — typical quote appears at checkout on the menu flow.
            </p>
            <ul className="text-[12px] text-charcoal/65 space-y-1.5 list-disc pl-4">
              <li>Warm plates, Vallejo pacing</li>
              <li>Made for lunch today, not mailing tomorrow</li>
            </ul>
          </article>

          <article className="rounded-2xl bg-charcoal text-cream p-5 md:p-6 shadow-[0_6px_0_rgba(0,0,0,0.15)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 rounded-full bg-gold/25 items-center justify-center text-[11px] font-bold text-gold">
                S
              </span>
              <h3 className="font-semibold text-gold text-sm uppercase tracking-wider">
                Shop (merch)
              </h3>
            </div>
            <p className="text-[13px] text-white/75 leading-relaxed mb-3">
              Apparel, drinkware, and gifts are batched for quality — plan on{" "}
              <strong className="text-cream font-semibold">2–3 business days</strong> before pickup.
              You&apos;ll hear from us when your bag is ready.
            </p>
            <ul className="text-[12px] text-white/65 space-y-1.5 list-disc pl-4 marker:text-gold">
              <li>We prep and pack merch with intention</li>
              <li>Expect a ping when your bag is ready for pickup</li>
            </ul>
          </article>
        </div>

        <p className="text-center text-[12px] text-charcoal/45 mt-8 max-w-lg mx-auto leading-relaxed">
          One smooth bag for café and shop lives at checkout — timing always appears before you pay.
        </p>
      </div>
    </section>
  );
}
