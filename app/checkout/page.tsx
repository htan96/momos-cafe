"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CheckoutPanel from "@/components/ordering/CheckoutPanel";
import CheckoutOrderSummary from "@/components/checkout/CheckoutOrderSummary";
import OrderConfirmation from "@/components/ordering/OrderConfirmation";
import { useCommerceCart } from "@/context/CartContext";
import { useAdminSettings } from "@/lib/useAdminSettings";
import { commerceCheckoutShell, commerceSectionSpacing } from "@/lib/commerce/tokens";
import { validateCartEligibilityFromAdminSettings } from "@/lib/ordering/validateCartEligibility";
import type { OrderPlacedVerification } from "@/types/order";

export default function CheckoutPage() {
  const router = useRouter();
  const { settings } = useAdminSettings();
  const { totalCount, foodCount, merchCount, lines, setDrawerOpen } = useCommerceCart();
  const [eligibilityTick, setEligibilityTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setEligibilityTick((t) => t + 1), 25000);
    return () => window.clearInterval(id);
  }, []);

  const eligibility = useMemo(
    () =>
      validateCartEligibilityFromAdminSettings(
        new Date(),
        lines,
        settings
      ),
    [lines, settings, eligibilityTick]
  );

  const checkoutLines = eligibility.eligibleLines;
  const heldAsideFood = eligibility.removedFoodLines;

  const foodOnlyKitchenClosed =
    totalCount > 0 && foodCount > 0 && merchCount === 0 && !eligibility.kitchenAcceptsFoodNow;

  useEffect(() => {
    if (eligibility.removedFoodLines.length === 0) return;
    try {
      localStorage.setItem(
        "momos_stashed_food_lines",
        JSON.stringify(eligibility.removedFoodLines)
      );
    } catch {
      /* ignore */
    }
  }, [eligibility.removedFoodLines]);

  const [commerceOrderId, setCommerceOrderId] = useState<string | null>(null);
  const [shipStreet, setShipStreet] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipState, setShipState] = useState("");
  const [shipZip, setShipZip] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<
    { uid: string; name: string; amountCents: number; estimatedDays?: number; provider?: string }[]
  >([]);
  const [selectedShip, setSelectedShip] = useState<{
    uid: string;
    name: string;
    amountCents: number;
    estimatedDays?: number;
    provider?: string;
  } | null>(null);
  const [quoteHint, setQuoteHint] = useState<string | null>(null);

  const [complete, setComplete] = useState<{
    orderNum: string;
    pickup?: string;
    verification?: OrderPlacedVerification | null;
  } | null>(null);

  useEffect(() => {
    if (totalCount === 0) router.replace("/order");
  }, [router, totalCount]);

  const hasShippableMerch = useMemo(
    () => checkoutLines.some((l) => l.kind === "merch" && l.shippingEligible),
    [checkoutLines]
  );

  const requiresShippingChoice = hasShippableMerch && shippingOptions.length > 0;

  const loadShippingQuotes = useCallback(async () => {
    const zip = shipZip.replace(/\D/g, "");
    if (shipStreet.trim().length < 3 || shipCity.trim().length < 2 || shipState.trim().length < 2 || zip.length < 5) {
      setQuoteHint("Add a full street, city, state, and ZIP to load delivery options.");
      return;
    }
    setQuoteLoading(true);
    setQuoteHint(null);
    try {
      const res = await fetch("/api/checkout/shipping-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: checkoutLines,
          address: {
            street: shipStreet.trim(),
            city: shipCity.trim(),
            state: shipState.trim(),
            postalCode: zip,
          },
          contact: {},
        }),
      });
      const data = (await res.json()) as {
        options?: {
          uid: string;
          name: string;
          amountCents: number;
          estimatedDays?: number;
          provider?: string;
        }[];
        message?: string;
      };
      if (!res.ok) {
        setShippingOptions([]);
        setSelectedShip(null);
        setQuoteHint("We couldn’t load options — you can still check out with pickup or try again.");
        return;
      }
      const opts = Array.isArray(data.options) ? data.options : [];
      setShippingOptions(opts);
      if (opts.length === 0) {
        setSelectedShip(null);
        setQuoteHint(
          typeof data.message === "string"
            ? data.message
            : "No delivery match for this address yet — try another ZIP or choose pickup."
        );
      } else {
        setSelectedShip(opts[0] ?? null);
        setQuoteHint(null);
      }
    } catch {
      setQuoteHint("Something went wrong loading delivery options.");
      setShippingOptions([]);
      setSelectedShip(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [checkoutLines, shipStreet, shipCity, shipState, shipZip]);

  if (totalCount === 0) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-teal-dark text-sm font-semibold uppercase tracking-[0.2em]">
        Heading to your bag…
      </div>
    );
  }

  if (complete) {
    return (
      <div className={`${commerceCheckoutShell.page} pb-24 pt-8 px-4`}>
        <div className={`max-w-lg mx-auto ${commerceCheckoutShell.card}`}>
          <OrderConfirmation
            orderNum={complete.orderNum}
            estimatedPickupTime={complete.pickup}
            verification={complete.verification}
            onOrderAgain={() => {
              setComplete(null);
              router.push("/order");
            }}
          />
        </div>
      </div>
    );
  }

  if (foodOnlyKitchenClosed) {
    return (
      <div className={`${commerceCheckoutShell.page} min-h-[70vh] flex items-center justify-center pb-24 pt-12 px-4`}>
        <div className={`max-w-md w-full ${commerceCheckoutShell.card} p-8 md:p-10 text-center space-y-5`}>
          <p className={commerceCheckoutShell.sectionLabel}>Momo&apos;s · Order</p>
          <h1 className="font-display text-2xl md:text-[28px] text-charcoal leading-snug">
            We&apos;re not taking food orders online right now
          </h1>
          {eligibility.notices.length > 0 ? (
            <div className="text-sm text-charcoal/75 leading-relaxed space-y-3 text-left border border-cream-dark rounded-xl p-4 bg-cream/40">
              {eligibility.notices.map((n) => (
                <p key={n}>{n}</p>
              ))}
            </div>
          ) : eligibility.nextFoodOrderingSummary ? (
            <p className="text-sm text-charcoal/75 leading-relaxed">{eligibility.nextFoodOrderingSummary}</p>
          ) : (
            <p className="text-sm text-charcoal/75 leading-relaxed">
              Your picks stay in your bag — take your time browsing the rest of the site.
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={() => router.push("/shop")}
              className="rounded-xl bg-teal-dark text-cream font-semibold py-3 px-6 text-sm hover:opacity-95"
            >
              Continue shopping
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-xl border-2 border-cream-dark bg-white text-charcoal font-semibold py-3 px-6 text-sm hover:bg-cream/50"
            >
              Review your bag
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${commerceCheckoutShell.page} pb-28 lg:pb-16 pt-6 px-4`}>
      <div className={`max-w-6xl mx-auto ${commerceSectionSpacing.gap} flex flex-col`}>
        <header className="space-y-2">
          <p className={commerceCheckoutShell.sectionLabel}>Checkout</p>
          <h1 className="font-display text-3xl text-charcoal">Almost there</h1>
          <p className="text-sm text-charcoal/65 max-w-2xl leading-relaxed">
            Take a last look, then finish up. Open{" "}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="text-teal-dark font-semibold underline-offset-2 hover:underline"
            >
              your cart
            </button>{" "}
            anytime.
          </p>
        </header>

        <CheckoutOrderSummary
          lines={checkoutLines}
          heldAsideFoodLines={heldAsideFood}
          variant="mobile"
        />

        {eligibility.notices.length > 0 ? (
          <div
            className={`${commerceCheckoutShell.card} p-4 md:p-5 border border-teal/20 bg-teal/5`}
            role="status"
          >
            {eligibility.notices.map((n) => (
              <p key={n} className="text-sm text-charcoal/80 leading-relaxed">
                {n}
              </p>
            ))}
          </div>
        ) : null}

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10 lg:items-start">
          <div className="space-y-6 min-w-0">
            {hasShippableMerch ? (
              <section
                className={`${commerceCheckoutShell.card} p-5 md:p-6`}
                aria-label="Delivery address"
              >
                <p className={commerceCheckoutShell.sectionLabel}>Delivery</p>
                <h2 className="font-display text-xl text-charcoal mt-1 mb-3">Ship to</h2>
                <p className="text-sm text-charcoal/65 mb-4 leading-relaxed">
                  Add your address to see mailing options for items we can ship.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-charcoal/55">
                    Street
                    <input
                      value={shipStreet}
                      onChange={(e) => setShipStreet(e.target.value)}
                      autoComplete="shipping address-line1"
                      className={commerceCheckoutShell.input}
                      placeholder="123 Main St"
                    />
                  </label>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-charcoal/55">
                    City
                    <input
                      value={shipCity}
                      onChange={(e) => setShipCity(e.target.value)}
                      autoComplete="shipping address-level2"
                      className={commerceCheckoutShell.input}
                      placeholder="Vallejo"
                    />
                  </label>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-charcoal/55">
                    State
                    <input
                      value={shipState}
                      onChange={(e) => setShipState(e.target.value)}
                      autoComplete="shipping address-level1"
                      className={commerceCheckoutShell.input}
                      placeholder="CA"
                    />
                  </label>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-charcoal/55">
                    ZIP
                    <input
                      value={shipZip}
                      onChange={(e) => setShipZip(e.target.value)}
                      autoComplete="shipping postal-code"
                      className={commerceCheckoutShell.input}
                      placeholder="94590"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => void loadShippingQuotes()}
                  disabled={quoteLoading}
                  className="mt-4 w-full sm:w-auto rounded-xl bg-teal-dark text-cream font-semibold py-2.5 px-5 text-sm hover:opacity-95 disabled:opacity-50"
                >
                  {quoteLoading ? "Loading options…" : "Load delivery options"}
                </button>
                {quoteHint ? <p className="mt-3 text-xs text-charcoal/55 leading-relaxed">{quoteHint}</p> : null}
                {shippingOptions.length > 0 ? (
                  <div className="mt-4 space-y-2" role="radiogroup" aria-label="Delivery options">
                    {shippingOptions.map((o) => {
                      const selected = selectedShip?.uid === o.uid;
                      return (
                        <label
                          key={o.uid}
                          className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                            selected ? "border-teal-dark bg-teal/5" : "border-cream-dark bg-white"
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <input
                              type="radio"
                              name="ship-opt"
                              checked={selected}
                              onChange={() => setSelectedShip(o)}
                              className="text-teal-dark"
                            />
                            <span className="font-medium text-charcoal truncate">{o.name}</span>
                          </span>
                          <span className="font-display text-charcoal shrink-0">
                            ${(o.amountCents / 100).toFixed(2)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            ) : null}

            <div className={`${commerceCheckoutShell.card} overflow-hidden`}>
              {checkoutLines.length > 0 ? (
                <CheckoutPanel
                  embedInPage
                  kitchenFoodPaymentAllowed={eligibility.kitchenAcceptsFoodNow}
                  shippingCents={selectedShip?.amountCents ?? 0}
                  selectedShippingQuoteUid={selectedShip?.uid ?? null}
                  selectedShippingLabel={selectedShip?.name ?? null}
                  selectedShippingProvider={selectedShip?.provider ?? null}
                  requiresShippingChoice={requiresShippingChoice}
                  commerceOrderId={commerceOrderId}
                  onCommerceOrderResolved={(id) => setCommerceOrderId(id)}
                  onOrderPlaced={(orderNum, pickup, verification) => {
                    setComplete({ orderNum, pickup, verification });
                  }}
                />
              ) : null}
            </div>
          </div>

          <div className="hidden lg:block min-w-0">
            <CheckoutOrderSummary
              lines={checkoutLines}
              heldAsideFoodLines={heldAsideFood}
              variant="desktop"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
