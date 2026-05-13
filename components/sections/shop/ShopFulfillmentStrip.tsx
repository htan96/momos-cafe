"use client";

export default function ShopFulfillmentStrip() {
  return (
    <div className="rounded-xl border border-teal/25 bg-teal/8 px-4 py-3 md:px-5 md:py-3.5 mb-6 md:mb-8">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="flex gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal text-white text-[10px] font-bold uppercase tracking-wide shadow-sm"
            aria-hidden
          >
            ETA
          </span>
          <div>
            <p className="font-semibold text-charcoal text-sm">Shop timing</p>
            <p className="text-[13px] text-charcoal/70 leading-snug mt-0.5">
              Most retail items are{" "}
              <strong className="text-charcoal font-semibold">made to order</strong> and ready for{" "}
              <strong className="text-charcoal font-semibold">pickup in 2–3 business days</strong>.
              Food from{" "}
              <strong className="text-charcoal font-semibold">Order Pickup</strong> is separate —
              usually ready in ~15 minutes.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <span className="rounded-full bg-white border border-cream-dark px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-charcoal/80">
            Pickup · Vallejo
          </span>
          <span className="rounded-full bg-white border border-cream-dark px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-charcoal/80">
            Shipping · Soon
          </span>
        </div>
      </div>
    </div>
  );
}
