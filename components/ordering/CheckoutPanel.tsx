"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { useCart, useCommerceCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { formatPickupTime } from "@/lib/pickupTime";
import { useAdminSettings, resolveOrderingRules } from "@/lib/useAdminSettings";
import { getNextAvailablePickupTime } from "@/lib/ordering/getNextAvailablePickupTime";
import { validateCartEligibilityFromAdminSettings } from "@/lib/ordering/validateCartEligibility";
import type { OrderPlacedVerification } from "@/types/order";
import type { UnifiedFoodLine, UnifiedMerchLine } from "@/types/commerce";
import type { CartItem } from "@/types/ordering";
import SquarePaymentForm from "./SquarePaymentForm";
import { commerceCheckoutShell } from "@/lib/commerce/tokens";

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function unifiedFoodToCartItem(line: UnifiedFoodLine): CartItem {
  return {
    id: line.id,
    variationId: line.variationId,
    name: line.name,
    price: line.price,
    quantity: line.quantity,
    modifiers: line.modifiers,
  };
}

interface CheckoutPanelProps {
  onCartClick?: () => void;
  onBackToMenu?: () => void;
  onBack?: () => void;
  onOrderPlaced?: (orderNum: string, estimatedPickupTime?: string, verification?: OrderPlacedVerification) => void;
  /** When false, food lines are excluded from payment for this attempt (merch/gifts may still clear). */
  kitchenFoodPaymentAllowed?: boolean;
  /** @deprecated Use `kitchenFoodPaymentAllowed` — storefront is never hard-closed. */
  orderingDisabled?: boolean;
  /** Cents from Square shipping quote (storefront checkout). */
  shippingCents?: number;
  selectedShippingQuoteUid?: string | null;
  selectedShippingLabel?: string | null;
  /** When shop items need ship quotes first */
  requiresShippingChoice?: boolean;
  commerceOrderId?: string | null;
  onCommerceOrderResolved?: (id: string) => void;
  /** Hide menu/back chrome — used on `/checkout` where the page owns navigation */
  embedInPage?: boolean;
}

const SQUARE_APP_ID =
  process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID?.trim() ||
  process.env.NEXT_PUBLIC_SQUARE_APP_ID?.trim() ||
  "";
const SQUARE_LOC_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID?.trim() ?? "";
const SQUARE_ENV_RAW = (process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT ?? "production").trim().toLowerCase();
const SQUARE_ENV = (SQUARE_ENV_RAW === "sandbox" ? "sandbox" : "production") as "sandbox" | "production";

export default function CheckoutPanel({
  onCartClick,
  onBackToMenu,
  onBack,
  onOrderPlaced,
  kitchenFoodPaymentAllowed = true,
  orderingDisabled = false,
  shippingCents = 0,
  selectedShippingQuoteUid = null,
  selectedShippingLabel = null,
  requiresShippingChoice = false,
  commerceOrderId = null,
  onCommerceOrderResolved,
  embedInPage = false,
}: CheckoutPanelProps) {
  const { settings } = useAdminSettings();
  const rules = resolveOrderingRules(settings.orderingRules);
  const allowKitchenPay = kitchenFoodPaymentAllowed && !orderingDisabled;
  const { items, total, count } = useCart();
  const { lines: allLines, guestCartToken, merchCount } = useCommerceCart();

  const foodItemsForPayment = useMemo(
    () => (allowKitchenPay ? items : []),
    [allowKitchenPay, items]
  );

  const foodQtyForPayment = useMemo(
    () => foodItemsForPayment.reduce((s, i) => s + i.quantity, 0),
    [foodItemsForPayment]
  );

  const foodTotalForPayment = useMemo(() => {
    let sub = 0;
    for (const item of foodItemsForPayment) {
      const modTotal = item.modifiers?.reduce((s, m) => s + m.price, 0) ?? 0;
      sub += (item.price + modTotal) * item.quantity;
    }
    return sub;
  }, [foodItemsForPayment]);
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
  const tax = foodTotalForPayment * taxRate;
  const foodGrandTotal = foodTotalForPayment + tax;

  const merchLines = useMemo(
    () => allLines.filter((l): l is UnifiedMerchLine => l.kind === "merch"),
    [allLines]
  );

  const merchSubtotal = useMemo(
    () => merchLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    [merchLines]
  );
  const merchTax = merchSubtotal * taxRate;
  const shippingUsd = shippingCents / 100;

  /**
   * One Square card flow for the combined bag when possible: a single `orders.create` + `payments.create`
   * carries kitchen catalog lines, shop lines, tax, and a `TOTAL_PHASE` shipping charge (see `/api/order`).
   *
   * Square only allows one fulfillment on `orders.create`; we keep kitchen pickup on the paid order and
   * treat ship-to-home operationally via fulfillment groups + `SHIPMENT`-style quotes from `orders.calculate`.
   */
  const combinedGrandTotal = foodGrandTotal + merchSubtotal + merchTax + shippingUsd;

  /** Food subtotal + tax (matches legacy /api/order food path). */
  const orderTotalCents = useMemo(() => {
    let subtotal = 0;
    for (const item of foodItemsForPayment) {
      const modTotal = item.modifiers?.reduce((s, m) => s + m.price, 0) ?? 0;
      subtotal += (item.price + modTotal) * item.quantity;
    }
    const t = subtotal * taxRate;
    return Math.round((subtotal + t) * 100);
  }, [foodItemsForPayment, taxRate]);

  const combinedOrderTotalCents = useMemo(() => {
    let mc = 0;
    for (const l of merchLines) {
      mc += Math.round(l.unitPrice * 100) * l.quantity;
    }
    const mtax = Math.round(mc * taxRate);
    return orderTotalCents + mc + mtax + shippingCents;
  }, [orderTotalCents, merchLines, shippingCents, taxRate]);

  const kitchenPickupUtc = useMemo(() => {
    if (foodQtyForPayment <= 0) return null;
    return getNextAvailablePickupTime(
      new Date(),
      settings.weeklyHours,
      settings.orderingRules,
      foodQtyForPayment,
      { maxFutureDaysOverride: 0 }
    );
  }, [foodQtyForPayment, settings.weeklyHours, settings.orderingRules]);

  const pickupDisplayInstant = kitchenPickupUtc;

  const squareTokenizeRef = useRef<(() => Promise<string | null>) | null>(null);
  const checkoutAttemptIdRef = useRef(crypto.randomUUID());

  const foodOnlyOutsideWindow =
    !allowKitchenPay && count > 0 && merchCount === 0;
  const hasCheckoutLines = count > 0 || merchCount > 0;
  const hasPayableLine =
    merchCount > 0 || (allowKitchenPay && count > 0 && kitchenPickupUtc !== null);
  const shippingGate = requiresShippingChoice && shippingCents <= 0;

  const ensureCommerceOrder = useCallback(async (): Promise<string | null> => {
    const elig = validateCartEligibilityFromAdminSettings(new Date(), allLines, settings);
    const payMerch = elig.eligibleLines.filter((l): l is UnifiedMerchLine => l.kind === "merch");
    if (payMerch.length === 0) return commerceOrderId ?? null;
    if (commerceOrderId) return commerceOrderId;
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestToken: guestCartToken ?? undefined,
        lines: elig.eligibleLines.map((l) => ({ ...l })),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; orderId?: string; error?: unknown };
    if (!res.ok) {
      showToast("We couldn’t save your shop order. Please try again.");
      return null;
    }
    const id = typeof data.orderId === "string" ? data.orderId : null;
    if (id) onCommerceOrderResolved?.(id);
    return id;
  }, [allLines, commerceOrderId, guestCartToken, onCommerceOrderResolved, settings, showToast]);

  const submitOrder = useCallback(
    async (token: string) => {
      const trimmedName = name.trim();
      const trimmedPhone = phone.trim();
      const trimmedEmail = email.trim();
      const trimmedNotes = notes.trim();

      const elig = validateCartEligibilityFromAdminSettings(new Date(), allLines, settings);
      const cartPayload = elig.eligibleLines
        .filter((l): l is UnifiedFoodLine => l.kind === "food")
        .map(unifiedFoodToCartItem);
      const merchPay = elig.eligibleLines.filter((l): l is UnifiedMerchLine => l.kind === "merch");

      if (cartPayload.length === 0 && merchPay.length === 0) {
        return;
      }

      const resolvedCommerceId = await ensureCommerceOrder();

      let pickupIso: string | undefined;
      if (cartPayload.length > 0) {
        const slot = getNextAvailablePickupTime(
          new Date(),
          settings.weeklyHours,
          settings.orderingRules,
          cartPayload.reduce((s, i) => s + i.quantity, 0),
          { maxFutureDaysOverride: 0 }
        );
        if (!slot) {
          showToast("The kitchen window just changed — refresh checkout and try again.");
          return;
        }
        pickupIso = slot.toISOString();
      }

      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart: cartPayload,
          customer: { name: trimmedName, phone: trimmedPhone, email: trimmedEmail, notes: trimmedNotes || undefined },
          fulfillment_type: "PICKUP",
          token,
          checkoutAttemptId: checkoutAttemptIdRef.current,
          merchLines: merchPay.map((l) => ({ ...l })),
          shippingCents,
          selectedShippingLabel: selectedShippingLabel ?? undefined,
          selectedShippingQuoteUid: selectedShippingQuoteUid ?? undefined,
          commerceOrderId: resolvedCommerceId ?? undefined,
          scheduledFor: pickupIso,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.error === "string" ? data.error : "Payment didn’t go through. Please try again.";
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
          typeof data.message === "string" ? data.message : "You’re all set — no charge today."
        );
      } else {
        const suffix =
          verification.paymentVerified && verification.squarePaymentStatus
            ? ` · ${verification.squarePaymentStatus}`
            : "";
        showToast(`Thank you! Order #${orderId.slice(-8).toUpperCase()}${suffix}`);
      }
      checkoutAttemptIdRef.current = crypto.randomUUID();
      onOrderPlaced?.(
        orderId,
        pickupDisplayInstant ? formatPickupTime(pickupDisplayInstant) : undefined,
        verification
      );
    },
    [
      allLines,
      settings,
      name,
      phone,
      email,
      notes,
      shippingCents,
      selectedShippingLabel,
      selectedShippingQuoteUid,
      ensureCommerceOrder,
      pickupDisplayInstant,
      onOrderPlaced,
      showToast,
    ]
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
        (newErrors.name && nameRef.current?.focus()) ||
          (newErrors.phone && phoneRef.current?.focus()) ||
          (newErrors.email && emailRef.current?.focus());
        return;
      }
      if (!hasCheckoutLines) {
        showToast("Your bag is empty");
        return;
      }
      if (shippingGate) {
        showToast("Choose a shipping option to continue.");
        return;
      }
      if (!hasPayableLine) {
        showToast("Nothing in your bag is ready to pay in this window.");
        return;
      }
      if (allowKitchenPay && count > 0 && !kitchenPickupUtc) {
        showToast("Kitchen pickup isn’t available for this moment — try again shortly.");
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
    [
      hasCheckoutLines,
      shippingGate,
      hasPayableLine,
      allowKitchenPay,
      count,
      kitchenPickupUtc,
      name,
      phone,
      email,
      showToast,
      submitOrder,
    ]
  );

  const handlePlaceOrder = useCallback(async () => {
    if (foodOnlyOutsideWindow) return;
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
      (newErrors.name && nameRef.current?.focus()) ||
        (newErrors.phone && phoneRef.current?.focus()) ||
        (newErrors.email && emailRef.current?.focus());
      return;
    }
    if (!hasCheckoutLines) {
      showToast("Your bag is empty");
      return;
    }
    if (shippingGate) {
      showToast("Choose a shipping option to continue.");
      return;
    }
    if (!hasPayableLine) {
      showToast("Nothing in your bag is ready to pay in this window.");
      return;
    }
    if (allowKitchenPay && count > 0 && !kitchenPickupUtc) {
      showToast("Kitchen pickup isn’t available for this moment — try again shortly.");
      return;
    }
    if (combinedOrderTotalCents <= 0) {
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
        showToast("Please check your card details and try again.");
        setPlacing(false);
        return;
      }
      await validateAndSubmit(token);
    } catch {
      showToast("Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
  }, [
    foodOnlyOutsideWindow,
    hasCheckoutLines,
    shippingGate,
    hasPayableLine,
    allowKitchenPay,
    count,
    kitchenPickupUtc,
    name,
    phone,
    email,
    combinedOrderTotalCents,
    showToast,
    validateAndSubmit,
  ]);

  return (
    <section className="scroll-mt-4" aria-label="Checkout">
      {!embedInPage && (onBack || onBackToMenu) && (
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

      <div className={embedInPage ? "p-5 md:p-6" : "p-6"}>
        {count > 0 ? (
          <>
            <h3 className="font-display text-xl text-charcoal mb-2">Fulfillment</h3>
            <p className="text-sm text-charcoal/70 mb-4 leading-relaxed">
              Morgen&apos;s Kitchen pickup at the window during active ordering hours — we anchor prep to the next
              available pickup inside today&apos;s posted window.
              {count > 0 && !allowKitchenPay ? (
                <span className="block mt-2 text-teal-dark font-semibold">
                  The kitchen isn&apos;t accepting food orders in this moment. Merchandise and gifts in your bag can
                  still be purchased — this payment will skip kitchen lines.
                </span>
              ) : null}
            </p>

            <div className="border border-teal/25 bg-teal/5 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-[15px] text-charcoal mb-1">Pickup timing</h4>
              {allowKitchenPay && kitchenPickupUtc ? (
                <div className="space-y-2">
                  <p className="text-xs text-charcoal/65 leading-relaxed">
                    Next pickup honors {rules.minimumPrepLeadMinutes}+ minutes of prep, today&apos;s hours, last-order
                    cutoff, and {rules.pickupIntervalMinutes}-minute spacing.
                  </p>
                  <p className="text-sm font-medium text-charcoal">
                    Locked arrival:{" "}
                    <span className="font-display text-teal-dark">{formatPickupTime(kitchenPickupUtc)}</span>
                  </p>
                  <p className="text-[11px] text-charcoal/55 leading-snug">
                    If the window changes before you pay, we&apos;ll refresh this moment automatically.
                  </p>
                </div>
              ) : allowKitchenPay && count > 0 ? (
                <p className="text-xs text-teal-dark font-semibold leading-relaxed">
                  No qualifying pickup remains in today&apos;s window — revisit when the kitchen is open or Ops hours
                  are adjusted.
                </p>
              ) : (
                <p className="text-xs text-charcoal/65 leading-relaxed">
                  We&apos;ll confirm shop shipping or pickup with your order when kitchen items aren&apos;t part of this
                  payment.
                </p>
              )}
            </div>
          </>
        ) : merchCount > 0 ? (
          <p className="text-sm text-charcoal/70 mb-6 leading-relaxed">
            Shop pickup and shipping are arranged with the selections in your bag — Momo&apos;s team
            handles each group from here.
          </p>
        ) : null}

        {(count > 0 || merchCount > 0) && (
          <div className="space-y-2 mb-6">
            {count > 0 && (
              <>
                <div className="flex justify-between text-sm text-charcoal/65 py-1.5 border-b border-cream-dark">
                  <span>Kitchen subtotal</span>
                  <span>${foodTotalForPayment.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-charcoal/65 py-1.5 border-b border-cream-dark">
                  <span>Kitchen tax (9.25%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
              </>
            )}
            {merchCount > 0 && (
              <>
                <div className="flex justify-between text-sm text-charcoal/65 py-1.5 border-b border-cream-dark">
                  <span>Shop subtotal</span>
                  <span>${merchSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-charcoal/65 py-1.5 border-b border-cream-dark">
                  <span>Shop tax (9.25%)</span>
                  <span>${merchTax.toFixed(2)}</span>
                </div>
              </>
            )}
            {shippingCents > 0 && (
              <div className="flex justify-between text-sm text-charcoal/65 py-1.5 border-b border-cream-dark">
                <span>{selectedShippingLabel ?? "Shipping"}</span>
                <span>${shippingUsd.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-[15px] text-charcoal py-2 mt-2">
              <span className="uppercase tracking-wider">Total</span>
              <span className="font-display text-[26px] md:text-[28px]">${combinedGrandTotal.toFixed(2)}</span>
            </div>
          </div>
        )}

        <h3 className="font-display text-xl text-charcoal mb-3">Contact</h3>
        <form className="contents" autoComplete="on" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label
                htmlFor="co-name"
                className="block font-semibold text-[10px] tracking-wider uppercase text-teal-dark mb-1"
              >
                Full name <span className="text-red">*</span>
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
                placeholder="Name for your order"
                autoComplete="name"
                className={`${commerceCheckoutShell.input} ${
                  errors.name ? "border-red" : ""
                }`}
              />
              {errors.name && <p className="text-red text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label
                htmlFor="co-phone"
                className="block font-semibold text-[10px] tracking-wider uppercase text-teal-dark mb-1"
              >
                Phone <span className="text-red">*</span>
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
                className={`${commerceCheckoutShell.input} ${
                  errors.phone ? "border-red" : ""
                }`}
              />
              {errors.phone && <p className="text-red text-xs mt-1">{errors.phone}</p>}
            </div>
          </div>
          <div className="mb-4">
            <label
              htmlFor="co-email"
              className="block font-semibold text-[10px] tracking-wider uppercase text-teal-dark mb-1"
            >
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
              className={`${commerceCheckoutShell.input} ${errors.email ? "border-red" : ""}`}
            />
            {errors.email && <p className="text-red text-xs mt-1">{errors.email}</p>}
          </div>
          <div className="mb-6">
            <label
              htmlFor="co-note"
              className="block font-semibold text-[10px] tracking-wider uppercase text-teal-dark mb-1"
            >
              Notes
            </label>
            <textarea
              id="co-note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Allergies, gift message, or pickup details…"
              rows={3}
              className={`${commerceCheckoutShell.input} resize-y min-h-[80px]`}
            />
          </div>
        </form>

        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-3">
            <h3 className="font-display text-xl text-charcoal">Payment</h3>
            <span className="bg-charcoal text-cream font-bold text-[10px] tracking-wider px-2 py-0.5 rounded">
              Square
            </span>
          </div>
          <p className="text-xs text-charcoal/55 mb-3 leading-snug">
            One secure checkout for your kitchen and shop items whenever they share the same run.
          </p>
          <div className="bg-cream border border-cream-dark rounded-xl p-5 min-h-[80px]">
            {SQUARE_APP_ID && SQUARE_LOC_ID ? (
              <SquarePaymentForm
                applicationId={SQUARE_APP_ID}
                locationId={SQUARE_LOC_ID}
                environment={SQUARE_ENV}
                totalAmount={combinedGrandTotal}
                onReady={(tokenize) => {
                  squareTokenizeRef.current = tokenize;
                }}
                onError={(msg) => showToast(msg)}
                onWalletToken={(token) => {
                  void validateAndSubmit(token);
                }}
                placing={placing}
              />
            ) : (
              <div className="text-center text-gray-mid font-medium text-sm tracking-wide">
                Payment is not configured for this build.
              </div>
            )}
          </div>
          <p className="flex items-center gap-1.5 mt-2.5 text-[11px] text-charcoal/40 font-medium">
            <span aria-hidden>🔒</span>
            Processed by Square · card data stays on their secure form
          </p>
        </div>

        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={
            !hasCheckoutLines ||
            placing ||
            foodOnlyOutsideWindow ||
            shippingGate ||
            !hasPayableLine ||
            (allowKitchenPay && count > 0 && !kitchenPickupUtc)
          }
          className={`w-full py-4 rounded-xl font-semibold text-base tracking-wider uppercase transition-all ${
            foodOnlyOutsideWindow
              ? "bg-gray-mid text-white/80 cursor-not-allowed shadow-none"
              : "bg-red text-cream shadow-[0_4px_0_#800] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:opacity-95"
          }`}
        >
          {foodOnlyOutsideWindow
            ? "Kitchen closed for food orders"
            : placing
              ? "Placing order…"
              : `Pay $${combinedGrandTotal.toFixed(2)}`}
        </button>
        <p className="text-center text-[11px] text-charcoal/45 mt-2.5 font-medium tracking-wide">
          Pickup · 1922 Broadway St · Morgen&apos;s Kitchen
          {pickupDisplayInstant && allowKitchenPay && count > 0 ? (
            <> · Locked {formatPickupTime(pickupDisplayInstant)}</>
          ) : null}
        </p>
      </div>
    </section>
  );
}
