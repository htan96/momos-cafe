"use client";

import { useState, useEffect, useImperativeHandle, useMemo } from "react";
import type { OrderPlacedVerification } from "@/types/order";
import { useCommerceCart } from "@/context/CartContext";
import { useAdminSettings } from "@/lib/useAdminSettings";
import { validateCartEligibilityFromAdminSettings } from "@/lib/ordering/validateCartEligibility";
import CartSummary from "./CartSummary";
import CheckoutPanel from "./CheckoutPanel";
import OrderConfirmation from "./OrderConfirmation";
import StickyCheckoutBar from "./StickyCheckoutBar";
import MixedCartCheckoutNotice from "@/components/commerce/MixedCartCheckoutNotice";

interface CheckoutFlowProps {
  onCartClick?: () => void;
  onBackToMenu?: () => void;
  /** Ref to expose goToCheckout for external triggers (e.g. CartDrawer) */
  checkoutRef?: React.RefObject<{ goToCheckout: () => void } | null>;
  /** Kitchen food payment allowed for this moment (same-day active window). */
  kitchenFoodPaymentAllowed?: boolean;
  /** @deprecated — storefront browsing is never disabled; prefer `kitchenFoodPaymentAllowed`. */
  orderingDisabled?: boolean;
}

export default function CheckoutFlow({
  onCartClick,
  onBackToMenu,
  checkoutRef,
  kitchenFoodPaymentAllowed: kitchenFoodPaymentAllowedProp,
  orderingDisabled = false,
}: CheckoutFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { settings } = useAdminSettings();
  const { lines, totalCount } = useCommerceCart();
  const [eligibilityTick, setEligibilityTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setEligibilityTick((t) => t + 1), 25000);
    return () => window.clearInterval(id);
  }, []);

  const computedKitchen = useMemo(
    () =>
      validateCartEligibilityFromAdminSettings(new Date(), lines, settings)
        .kitchenAcceptsFoodNow,
    [lines, settings, eligibilityTick]
  );

  const kitchenFoodPaymentAllowed =
    kitchenFoodPaymentAllowedProp !== undefined
      ? kitchenFoodPaymentAllowedProp
      : computedKitchen;
  const [orderNum, setOrderNum] = useState("");
  const [estimatedPickupTime, setEstimatedPickupTime] = useState<string | undefined>();
  const [orderVerification, setOrderVerification] = useState<OrderPlacedVerification | null>(null);

  const goToCheckout = () => {
    setStep(2);
    document.getElementById("checkout-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useImperativeHandle(checkoutRef, () => ({ goToCheckout }), []);

  useEffect(() => {
    if (step === 3) {
      document.getElementById("order-success-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [step]);

  const handleOrderPlaced = (num: string, pickupTime?: string, verification?: OrderPlacedVerification) => {
    setOrderNum(num);
    setEstimatedPickupTime(pickupTime);
    setOrderVerification(verification ?? null);
    setStep(3);
  };

  const handleOrderAgain = () => {
    setOrderNum("");
    setOrderVerification(null);
    setStep(1);
  };

  const stepIndicator = (
    <div className="flex items-center gap-2" aria-label="Checkout steps">
      {([1, 2, 3] as const).map((s) => (
        <span
          key={s}
          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
            step === s
              ? "bg-gold text-charcoal"
              : step > s
                ? "bg-white text-teal-dark"
                : "bg-white/20 text-white/50"
          }`}
        >
          {s}
        </span>
      ))}
    </div>
  );

  return (
    <div
      id="checkout-section"
      className="lg:col-span-1 lg:sticky lg:top-24 lg:self-start"
    >
      {/* Step indicator header — always visible */}
      <div className="bg-teal-dark px-5 py-4 rounded-t-2xl border-[1.5px] border-b-0 border-cream-dark flex items-center justify-between">
        <span className="font-display text-[18px] text-cream">
          {step === 1 && "Your Order"}
          {step === 2 && "Checkout"}
          {step === 3 && "Confirmation"}
        </span>
        {stepIndicator}
      </div>

      {/* Step content — only one visible */}
      <div className="bg-white border-[1.5px] border-cream-dark rounded-b-2xl overflow-hidden -mt-px">
        {step === 1 && (
          <>
            <MixedCartCheckoutNotice variant="cart" />
            <CartSummary onNext={() => setStep(2)} />
          </>
        )}
        {step === 2 && (
          <>
            <MixedCartCheckoutNotice variant="checkout" />
            <CheckoutPanel
              onCartClick={onCartClick}
              onBackToMenu={onBackToMenu}
              onBack={() => setStep(1)}
              onOrderPlaced={handleOrderPlaced}
              kitchenFoodPaymentAllowed={kitchenFoodPaymentAllowed}
              orderingDisabled={orderingDisabled}
            />
          </>
        )}
        {step === 3 && (
          <OrderConfirmation
            orderNum={orderNum}
            estimatedPickupTime={estimatedPickupTime}
            verification={orderVerification}
            onOrderAgain={handleOrderAgain}
          />
        )}
      </div>

      {/* Sticky checkout CTA — visible when on step 1 with items */}
      <StickyCheckoutBar onGoToCheckout={goToCheckout} visible={step === 1 && totalCount > 0} orderingDisabled={false} />
    </div>
  );
}
