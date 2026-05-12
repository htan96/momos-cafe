"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CheckoutFlow from "@/components/ordering/CheckoutFlow";
import { useCommerceCart } from "@/context/CartContext";
import RetailDraftCheckoutSection from "@/components/commerce/RetailDraftCheckoutSection";
import { useAdminSettings, getOrderingStatus } from "@/lib/useAdminSettings";
import { getShippingQuotes } from "@/lib/shipping/pirateShipClient";

export default function CheckoutPage() {
  const router = useRouter();
  const { settings } = useAdminSettings();
  const orderingGate = getOrderingStatus(settings);

  const { totalCount, foodCount, merchCount, lines, setDrawerOpen } = useCommerceCart();

  useEffect(() => {
    if (totalCount === 0) router.replace("/order");
  }, [router, totalCount]);

  const hasShippableMerch = useMemo(
    () => lines.some((l) => l.kind === "merch" && l.shippingEligible),
    [lines]
  );

  const foodOrderingDisabled = foodCount > 0 && !orderingGate.canAccept;
  const [shipPostal, setShipPostal] = useState("");
  const [quoteProbe, setQuoteProbe] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!hasShippableMerch || shipPostal.replace(/\D/g, "").length < 5) {
        setQuoteProbe("");
        return;
      }
      const quotes = await getShippingQuotes({
        shipToPostalCode: shipPostal,
        weightOz: 16,
      });
      if (!cancelled)
        setQuoteProbe(
          quotes.length === 0
            ? "No live Pirate Ship quotes yet — set `PIRATE_SHIP_API_KEY` and wire endpoints in `lib/shipping/pirateShipClient.ts`."
            : `${quotes.length} rate(s) available (prototype).`
        );
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [hasShippableMerch, shipPostal]);

  if (totalCount === 0) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-teal-dark text-sm font-semibold uppercase tracking-[0.2em]">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream text-charcoal pb-28 lg:pb-12 pt-6 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-dark">Checkout</p>
          <h1 className="font-display text-3xl">Kitchen + Shop</h1>
          <p className="text-sm text-charcoal/65 max-w-2xl leading-relaxed">
            One bag for Morgen pickup and retail fulfillment groups. Adjust items anytime from{" "}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="text-teal-dark font-semibold underline-offset-2 hover:underline"
            >
              your cart drawer
            </button>
            .
          </p>
        </header>

        {hasShippableMerch ? (
          <section
            className="rounded-2xl border border-cream-dark bg-white px-5 py-4 space-y-3"
            aria-label="Shipping preview"
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-teal-dark">
                Ship-eligible merchandise
              </p>
              <p className="text-sm text-charcoal/75 mt-1">
                Collect destination postal code for rate shopping — wired to Pirate Ship stubs (see comments in{" "}
                <code className="text-xs bg-cream-dark/40 px-1 rounded">lib/shipping/pirateShipClient.ts</code>
                ).
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/60">
                Destination postal code
                <input
                  value={shipPostal}
                  onChange={(e) => setShipPostal(e.target.value)}
                  autoComplete="postal-code"
                  className="mt-1 block w-full rounded-xl border border-cream-dark px-3 py-2 bg-cream text-[15px] focus:outline-none focus:ring-2 focus:ring-teal/25"
                  placeholder="94107"
                />
              </label>
            </div>
            {quoteProbe && <p className="text-xs text-charcoal/55">{quoteProbe}</p>}
          </section>
        ) : null}

        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(280px,1fr)_minmax(360px,440px)] lg:gap-10 lg:items-start">
          <div className="order-1 lg:order-2 w-full lg:sticky lg:top-28">
            {foodCount > 0 ? (
              <CheckoutFlow
                orderingDisabled={foodOrderingDisabled}
                onCartClick={() => setDrawerOpen(true)}
                onBackToMenu={() => router.push("/menu")}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-cream-dark bg-white px-5 py-6 text-center text-charcoal/60 text-sm leading-relaxed">
                Add food pickup items from{" "}
                <button
                  type="button"
                  onClick={() => router.push("/order")}
                  className="font-semibold text-teal-dark hover:underline"
                >
                  Order
                </button>
                &nbsp;if you would like them on the same run.
              </div>
            )}
          </div>

          <div className="order-2 lg:order-1 w-full space-y-4">{merchCount > 0 ? <RetailDraftCheckoutSection /> : null}</div>
        </div>
      </div>
    </div>
  );
}
