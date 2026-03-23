"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { getEstimatedPickupTime, formatPickupTime } from "@/lib/pickupTime";
import type { OrderPlacedVerification } from "@/types/order";
import SquarePaymentForm from "./SquarePaymentForm";

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

interface CheckoutPanelProps {
  onCartClick?: () => void;
  onBackToMenu?: () => void;
  onBack?: () => void;
  onOrderPlaced?: (orderNum: string, estimatedPickupTime?: string, verification?: OrderPlacedVerification) => void;
  orderingDisabled?: boolean;
}

const SQUARE_APP_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "";
const SQUARE_LOC_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "";
const SQUARE_ENV = (process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT ?? "production") as "sandbox" | "production";

export default function CheckoutPanel({ onCartClick, onBackToMenu, onBack, onOrderPlaced, orderingDisabled = false }: CheckoutPanelProps) {
  const { items, total, count } = useCart();
  const showToast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const taxRate = 0.0925;
  const tax = total * taxRate;
  const grandTotal = total + tax;

  /** Must match /api/order getCartTotalCents (subtotal + tax, rounded cents). */
  const orderTotalCents = useMemo(() => {
    let subtotal = 0;
    for (const item of items) {
      const modTotal = item.modifiers?.reduce((s, m) => s + m.price, 0) ?? 0;
      subtotal += (item.price + modTotal) * item.quantity;
    }
    const t = subtotal * taxRate;
    return Math.round((subtotal + t) * 100);
  }, [items]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const estimatedPickupTime = useMemo(
    () => (itemCount > 0 ? getEstimatedPickupTime(itemCount) : null),
    [itemCount]
  );

  const squareTokenizeRef = useRef<(() => Promise<string | null>) | null>(null);

  const submitOrder = useCallback(
    async (token: string) => {
      const trimmedName = name.trim();
      const trimmedPhone = phone.trim();
      const trimmedEmail = email.trim();
      const trimmedNotes = notes.trim();
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart: items,
          customer: { name: trimmedName, phone: trimmedPhone, email: trimmedEmail, notes: trimmedNotes || undefined },
          fulfillment_type: "PICKUP",
          token,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.error === "string" ? data.error : "Payment failed. Please try again.";
        showToast(msg);
        return;
      }
      const orderId = data.orderId ?? data.paymentId ?? "unknown";
      const verification: OrderPlacedVerification =
        data.isFreeOrder === true
          ? { paymentVerified: true, freeOrder: true }
          : {
              paymentVerified: data.paymentVerified === true,
              squarePaymentStatus:
                typeof data.squarePaymentStatus === "string" ? data.squarePaymentStatus : undefined,
              squarePaymentId: typeof data.squarePaymentId === "string" ? data.squarePaymentId : undefined,
              receiptNumber: typeof data.receiptNumber === "string" ? data.receiptNumber : undefined,
            };
      if (data.isFreeOrder === true) {
        showToast(
          typeof data.message === "string" ? data.message : "Order placed successfully (no charge)"
        );
      } else {
        const suffix =
          verification.paymentVerified && verification.squarePaymentStatus
            ? ` · ${verification.squarePaymentStatus}`
            : "";
        showToast(`Order placed! #${orderId.slice(-8).toUpperCase()}${suffix}`);
      }
      onOrderPlaced?.(
        orderId,
        estimatedPickupTime ? formatPickupTime(estimatedPickupTime) : undefined,
        verification
      );
    },
    [items, name, phone, email, notes, estimatedPickupTime, onOrderPlaced, showToast]
  );

  const validateAndSubmit = useCallback(
    async (token: string) => {
      const trimmedName = name.trim();
      const trimmedPhone = phone.trim();
      const trimmedEmail = email.trim();
      const newErrors: { name?: string; phone?: string; email?: string } = {};
      if (!trimmedName) newErrors.name = "Name is required";
      if (!trimmedPhone) newErrors.phone = "Phone is required";
      else if (!isValidPhone(trimmedPhone)) newErrors.phone = "Enter a valid phone number (at least 10 digits)";
      if (!trimmedEmail) newErrors.email = "Email is required";
      else if (!isValidEmail(trimmedEmail)) newErrors.email = "Enter a valid email address";
      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
        (newErrors.name && nameRef.current?.focus()) || (newErrors.phone && phoneRef.current?.focus()) || (newErrors.email && emailRef.current?.focus());
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
    [count, name, phone, email, showToast, submitOrder]
  );

  const handlePlaceOrder = useCallback(async () => {
    if (orderingDisabled) return;
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    const newErrors: { name?: string; phone?: string; email?: string } = {};
    if (!trimmedName) newErrors.name = "Name is required";
    if (!trimmedPhone) newErrors.phone = "Phone is required";
    else if (!isValidPhone(trimmedPhone)) newErrors.phone = "Enter a valid phone number (at least 10 digits)";
    if (!trimmedEmail) newErrors.email = "Email is required";
    else if (!isValidEmail(trimmedEmail)) newErrors.email = "Enter a valid email address";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      (newErrors.name && nameRef.current?.focus()) || (newErrors.phone && phoneRef.current?.focus()) || (newErrors.email && emailRef.current?.focus());
      return;
    }
    if (count === 0) {
      showToast("Add items to your cart first");
      return;
    }
    if (orderTotalCents <= 0) {
      setPlacing(true);
      try {
        await validateAndSubmit("");
      } catch {
        showToast("Something went wrong. Please try again.");
      } finally {
        setPlacing(false);
      }
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
        showToast("Card validation failed. Please check your card details.");
        setPlacing(false);
        return;
      }
      await validateAndSubmit(token);
    } catch {
      showToast("Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
  }, [orderingDisabled, count, name, phone, email, orderTotalCents, showToast, validateAndSubmit]);

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
          Pickup only
        </h3>

        <div className="bg-teal/10 border border-teal/20 rounded-lg p-4 mb-6 flex gap-2.5">
          <span>ℹ️</span>
          <p className="text-[13px] text-teal-dark leading-relaxed">
            <strong>Pickup only.</strong>{" "}
            Order ahead and pick up at the window. Delivery coming soon — we&apos;ll announce on Instagram @momoscafe.
          </p>
        </div>

        <div className="border-2 border-teal bg-teal/5 rounded-2xl p-4 mb-6">
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
        {/* autoComplete="on" helps browsers offer saved contact info near checkout (card fields are in Square’s iframe). */}
        <form className="contents" autoComplete="on" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="co-name" className="block font-semibold text-[10px] tracking-wider uppercase text-teal-dark mb-1">
              Full Name <span className="text-red">*</span>
            </label>
            <input
              ref={nameRef}
              id="co-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="Your name for pickup"
              autoComplete="name"
              className={`w-full px-3.5 py-2.5 rounded-lg border bg-cream text-charcoal text-[15px] placeholder:text-charcoal/35 focus:outline-none focus:ring-2 focus:ring-teal/10 ${errors.name ? "border-red" : "border-cream-dark focus:border-teal"}`}
            />
            {errors.name && <p className="text-red text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="co-phone" className="block font-semibold text-[10px] tracking-wider uppercase text-teal-dark mb-1">
              Phone Number <span className="text-red">*</span>
            </label>
            <input
              ref={phoneRef}
              id="co-phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              placeholder="(707) 000-0000"
              autoComplete="tel"
              className={`w-full px-3.5 py-2.5 rounded-lg border bg-cream text-charcoal text-[15px] placeholder:text-charcoal/35 focus:outline-none focus:ring-2 focus:ring-teal/10 ${errors.phone ? "border-red" : "border-cream-dark focus:border-teal"}`}
            />
            {errors.phone && <p className="text-red text-xs mt-1">{errors.phone}</p>}
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="co-email" className="block font-semibold text-[10px] tracking-wider uppercase text-teal-dark mb-1">
            Email <span className="text-red">*</span>
          </label>
          <input
            ref={emailRef}
            id="co-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="your@email.com"
            autoComplete="email"
            className={`w-full px-3.5 py-2.5 rounded-lg border bg-cream text-charcoal text-[15px] placeholder:text-charcoal/35 focus:outline-none focus:ring-2 focus:ring-teal/10 ${errors.email ? "border-red" : "border-cream-dark focus:border-teal"}`}
          />
          {errors.email && <p className="text-red text-xs mt-1">{errors.email}</p>}
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
        </form>

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
                  validateAndSubmit(token);
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
              : "bg-red text-white shadow-[0_4px_0_#800] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:opacity-90"
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
