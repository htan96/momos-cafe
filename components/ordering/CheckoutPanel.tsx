"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { useAdminSettings, DEFAULT_SETTINGS } from "@/lib/useAdminSettings";
import { getEstimatedPickupTime, formatPickupTime } from "@/lib/pickupTime";
import SquarePaymentForm from "./SquarePaymentForm";

interface CheckoutPanelProps {
  onCartClick?: () => void;
  onBackToMenu?: () => void;
  /** When in step flow: go back to step 1 */
  onBack?: () => void;
  /** When order is placed: transition to step 3 */
  onOrderPlaced?: (orderNum: string) => void;
  orderingDisabled?: boolean;
}

const SQUARE_APP_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "";
const SQUARE_LOC_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "";
const SQUARE_ENV = (process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT ?? "production") as "sandbox" | "production";

export default function CheckoutPanel({ onCartClick, onBackToMenu, onBack, onOrderPlaced, orderingDisabled = false }: CheckoutPanelProps) {
  const { items, total, count } = useCart();
  const showToast = useToast();
  const { settings } = useAdminSettings();
  const deliveryComingSoon =
    settings?.deliveryComingSoon ?? DEFAULT_SETTINGS.deliveryComingSoon;
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const taxRate = 0.0925;
  const tax = total * taxRate;
  const grandTotal = total + tax;

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const estimatedPickupTime = useMemo(
    () => (itemCount > 0 ? getEstimatedPickupTime(itemCount) : null),
    [itemCount]
  );

  const squareTokenizeRef = useRef<(() => Promise<string | null>) | null>(null);

  const submitOrder = useCallback(
    async (token: string) => {
      const trimmedName = name.trim();
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart: items,
          customer: { name: trimmedName, phone, email, notes },
          token,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error ?? "Payment failed. Please try again.");
        return;
      }
      const orderId = data.orderId ?? data.paymentId ?? "unknown";
      showToast(`Order placed! #${orderId.slice(-8).toUpperCase()}`);
      onOrderPlaced?.(orderId);
    },
    [items, name, phone, email, notes, onOrderPlaced, showToast]
  );

  const handlePlaceOrderWithToken = useCallback(
    async (token: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        nameRef.current?.focus();
        nameRef.current?.classList.add("border-red");
        showToast("Please enter your name");
        return;
      }
      if (count === 0) {
        showToast("Add items to your cart first");
        return;
      }
      setPlacing(true);
      try {
        await submitOrder(token);
      } catch {
        showToast("Something went wrong. Please try again.");
      } finally {
        setPlacing(false);
      }
    },
    [count, name, showToast, submitOrder]
  );

  const handlePlaceOrder = useCallback(async () => {
    if (orderingDisabled) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      nameRef.current?.focus();
      nameRef.current?.classList.add("border-red");
      showToast("Please enter your name");
      return;
    }
    if (count === 0) {
      showToast("Add items to your cart first");
      return;
    }

    const tokenize = squareTokenizeRef.current;
    if (!tokenize) {
      showToast("Payment form is still loading. Please wait.");
      return;
    }

    setPlacing(true);
    try {
      const token = await tokenize();
      if (!token) {
        setPlacing(false);
        return;
      }
      await submitOrder(token);
    } catch {
      showToast("Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
  }, [orderingDisabled, count, name, showToast, submitOrder]);

  return (
    <section className="scroll-mt-4" aria-label="Checkout">
      {(onBack || onBackToMenu) && (
        <div className="flex gap-2 border-b border-cream-dark">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-6 py-3 text-left text-sm font-semibold text-teal-dark hover:bg-cream/50 transition-colors"
            >
              ← Back
            </button>
          )}
          {onBackToMenu && (
            <button
              type="button"
              onClick={onBackToMenu}
              className="px-6 py-3 text-sm font-semibold text-teal-dark hover:bg-cream/50 transition-colors"
            >
              Menu
            </button>
          )}
        </div>
      )}

      <div className="p-6">
        <h3 className="font-display text-[22px] text-charcoal mb-3">
          How are you getting your order?
        </h3>

        <div className="bg-teal/10 border border-teal/20 rounded-lg p-4 mb-6 flex gap-2.5">
          <span>ℹ️</span>
          <p className="text-[13px] text-teal-dark leading-relaxed">
            <strong>Pickup is currently available.</strong>{" "}
            {deliveryComingSoon
              ? "Delivery will be available soon — we'll announce it on Instagram @momoscafe."
              : "Delivery is available via DoorDash and Uber Eats."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <button
            type="button"
            onClick={() => setFulfillment("pickup")}
            className={`relative border-2 rounded-2xl p-4 text-left transition-all ${
              fulfillment === "pickup"
                ? "border-teal bg-teal/5"
                : "border-cream-dark hover:border-teal-light"
            }`}
          >
            {fulfillment === "pickup" && (
              <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-teal text-white flex items-center justify-center text-xs">
                ✓
              </span>
            )}
            <span className="text-3xl block mb-2">🏃</span>
            <h4 className="font-semibold text-[15px] text-charcoal mb-1">Pickup</h4>
            <p className="text-xs text-gray-mid leading-relaxed">
              Order ahead and pick up at the window.
              {estimatedPickupTime && (
                <span className="block mt-1 font-semibold text-teal-dark">
                  Est. pickup: {formatPickupTime(estimatedPickupTime)}
                </span>
              )}
            </p>
            <span className="inline-block mt-2 text-[10px] font-semibold tracking-wider uppercase bg-teal text-white px-2 py-1 rounded">
              Available Now
            </span>
          </button>

          {deliveryComingSoon ? (
            <div
              className="border-2 border-cream-dark rounded-2xl p-4 opacity-55 cursor-not-allowed bg-cream"
              aria-disabled="true"
            >
              <span className="text-3xl block mb-2">🛵</span>
              <h4 className="font-semibold text-[15px] text-charcoal mb-1">Delivery</h4>
              <p className="text-xs text-gray-mid leading-relaxed mb-2">
                Get Momo&apos;s delivered to your door.
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase text-gray-mid bg-charcoal/5 px-2 py-1 rounded">
                🔜 Coming Soon
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setFulfillment("delivery")}
              className={`relative border-2 rounded-2xl p-4 text-left transition-all ${
                fulfillment === "delivery"
                  ? "border-teal bg-teal/5"
                  : "border-cream-dark hover:border-teal-light"
              }`}
            >
              {fulfillment === "delivery" && (
                <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-teal text-white flex items-center justify-center text-xs">
                  ✓
                </span>
              )}
              <span className="text-3xl block mb-2">🛵</span>
              <h4 className="font-semibold text-[15px] text-charcoal mb-1">Delivery</h4>
              <p className="text-xs text-gray-mid leading-relaxed">
                Get Momo&apos;s delivered to your door via DoorDash or Uber Eats.
              </p>
              <span className="inline-block mt-2 text-[10px] font-semibold tracking-wider uppercase bg-teal text-white px-2 py-1 rounded">
                Available
              </span>
            </button>
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm text-charcoal/65 py-1.5 border-b border-cream-dark">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-charcoal/65 py-1.5 border-b border-cream-dark">
              <span>Tax (9.25%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-charcoal/65 py-1.5">
              <span>Pickup Fee</span>
              <span>Free</span>
            </div>
            <div className="flex justify-between font-bold text-[15px] text-charcoal py-2 mt-2">
              <span className="uppercase tracking-wider">Total</span>
              <span className="font-display text-[28px]">${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        )}

        <h3 className="font-display text-[22px] text-charcoal mb-3">Your Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="co-name" className="block font-semibold text-[10px] tracking-wider uppercase text-teal-dark mb-1">
              Full Name
            </label>
            <input
              ref={nameRef}
              id="co-name"
              type="text"
              value={name}
              onChange={(e) => {
              setName(e.target.value);
              nameRef.current?.classList.remove("border-red");
            }}
              placeholder="Your name for pickup"
              autoComplete="name"
              className="w-full px-3.5 py-2.5 rounded-lg border border-cream-dark bg-cream text-charcoal text-[15px] placeholder:text-charcoal/35 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/10"
            />
          </div>
          <div>
            <label htmlFor="co-phone" className="block font-semibold text-[10px] tracking-wider uppercase text-teal-dark mb-1">
              Phone Number
            </label>
            <input
              id="co-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(707) 000-0000"
              autoComplete="tel"
              className="w-full px-3.5 py-2.5 rounded-lg border border-cream-dark bg-cream text-charcoal text-[15px] placeholder:text-charcoal/35 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/10"
            />
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="co-email" className="block font-semibold text-[10px] tracking-wider uppercase text-teal-dark mb-1">
            Email (optional — for receipt)
          </label>
          <input
            id="co-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoComplete="email"
            className="w-full px-3.5 py-2.5 rounded-lg border border-cream-dark bg-cream text-charcoal text-[15px] placeholder:text-charcoal/35 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/10"
          />
        </div>
        <div className="mb-6">
          <label htmlFor="co-note" className="block font-semibold text-[10px] tracking-wider uppercase text-teal-dark mb-1">
            Special Instructions
          </label>
          <textarea
            id="co-note"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Allergies, sauce on the side, extra napkins..."
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-lg border border-cream-dark bg-cream text-charcoal text-[15px] placeholder:text-charcoal/35 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/10 resize-y min-h-[80px]"
          />
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-3">
            <h3 className="font-display text-[22px] text-charcoal">Payment</h3>
            <span className="bg-charcoal text-white font-bold text-[10px] tracking-wider px-2 py-0.5 rounded">
              ■ Square
            </span>
          </div>
          <div className="bg-cream border border-cream-dark rounded-lg p-5 min-h-[80px]">
            {SQUARE_APP_ID && SQUARE_LOC_ID ? (
              <SquarePaymentForm
                applicationId={SQUARE_APP_ID}
                locationId={SQUARE_LOC_ID}
                environment={SQUARE_ENV}
                totalAmount={grandTotal}
                onReady={(tokenize) => {
                  squareTokenizeRef.current = tokenize;
                }}
                onError={(msg) => showToast(msg)}
                onWalletToken={(token) => {
                  handlePlaceOrderWithToken(token);
                }}
                placing={placing}
              />
            ) : (
              <div className="text-center text-gray-mid font-medium text-sm tracking-wide">
                <div className="text-3xl mb-2">💳</div>
                Configure NEXT_PUBLIC_SQUARE_APPLICATION_ID and NEXT_PUBLIC_SQUARE_LOCATION_ID
              </div>
            )}
          </div>
          <p className="flex items-center gap-1.5 mt-2.5 text-[11px] text-charcoal/40 font-medium">
            <span>🔒</span>
            Secured by Square · Your card info never touches our servers
          </p>
        </div>

        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={count === 0 || placing || orderingDisabled}
          className={`w-full py-4 rounded-lg font-semibold text-base tracking-wider uppercase transition-all ${
            orderingDisabled
              ? "bg-gray-mid text-white/80 cursor-not-allowed shadow-none"
              : "bg-red text-white shadow-[0_4px_0_#a01e23] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:opacity-90"
          }`}
        >
          {orderingDisabled ? "Ordering is unavailable" : placing ? "Placing Order..." : `Place Order — $${grandTotal.toFixed(2)}`}
        </button>
        <p className="text-center text-[11px] text-charcoal/40 mt-2.5 font-medium tracking-wide">
          Pickup at 1922 Broadway St · Morgen&apos;s Kitchen
          {estimatedPickupTime && (
            <> · Est. {formatPickupTime(estimatedPickupTime)}</>
          )}
        </p>
      </div>
    </section>
  );
}
