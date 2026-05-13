"use client";

import { commerceCheckoutShell } from "@/lib/commerce/tokens";

/** Calm pickup framing on `/menu` — editorial tone, aligned with commerce shell tokens. */
export default function MenuPickupContextStrip() {
  return (
    <div className="rounded-2xl border border-cream-dark bg-white px-5 py-5 md:px-7 md:py-6 mb-6 md:mb-8 shadow-[0_10px_36px_-22px_rgba(45,107,107,0.14)]">
      <p className={`${commerceCheckoutShell.sectionLabel} mb-3`}>Pickup timing</p>
      <p className="font-display text-[15px] md:text-[17px] text-charcoal leading-[1.55] max-w-2xl">
        Ready in about 15 minutes — or schedule a pickup time that works for you.
      </p>
    </div>
  );
}
