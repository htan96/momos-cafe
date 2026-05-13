"use client";

import { useState, useEffect, useRef } from "react";

const DEBUG_CHECKOUT = process.env.NODE_ENV === "development";
import type { OrderPlacedVerification } from "@/types/order";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";
import CartSummary from "./CartSummary";
import CheckoutPanel from "./CheckoutPanel";
import OrderConfirmation from "./OrderConfirmation";

interface MobileCheckoutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu?: () => void;
  orderingDisabled?: boolean;
}

export default function MobileCheckoutOverlay({
  isOpen,
  onClose,
  onBackToMenu,
  orderingDisabled = false,
}: MobileCheckoutOverlayProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [orderNum, setOrderNum] = useState("");
  const [estimatedPickupTime, setEstimatedPickupTime] = useState<string | undefined>();
  const [orderVerification, setOrderVerification] = useState<OrderPlacedVerification | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setOrderNum("");
      setEstimatedPickupTime(undefined);
      setOrderVerification(null);
    }
  }, [isOpen]);

  const handleBackFromStep1 = () => onClose();
  const handleBackToStep1 = () => setStep(1);
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  useEffect(() => {
    if (DEBUG_CHECKOUT) console.log("[MobileCheckoutOverlay] mount");
    return () => {
      if (DEBUG_CHECKOUT) console.log("[MobileCheckoutOverlay] unmount");
    };
  }, []);
  const swipe = useSwipeToClose({
    onClose: step === 1 ? handleBackFromStep1 : handleBackToStep1,
    enabled: isOpen,
    direction: "down",
  });

  if (!isOpen) return null;

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
    onClose();
  };

  return (
    <div
      className="lg:hidden fixed inset-0 z-[900] bg-cream flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
      style={swipe.style}
    >
      {/* Header — touch target for swipe-to-close */}
      <div
        className="bg-teal-dark px-4 py-4 flex items-center justify-between border-b-2 border-gold flex-shrink-0"
        style={{ touchAction: "none" }}
        onTouchStart={swipe.onTouchStart}
        onTouchMove={swipe.onTouchMove}
        onTouchEnd={swipe.onTouchEnd}
      >
        <button
          type="button"
          onClick={step === 1 ? handleBackFromStep1 : () => setStep(1)}
          className="flex items-center gap-2 text-cream font-semibold text-sm hover:text-white/90 transition-colors"
          aria-label={step === 1 ? "Back to menu" : "Back to cart"}
        >
          ← {step === 1 ? "Menu" : "Back"}
        </button>
        <span className="font-display text-[18px] text-cream">
          {step === 1 && "Your Order"}
          {step === 2 && "Checkout"}
          {step === 3 && "Confirmation"}
        </span>
        <div className="w-14" aria-hidden />
      </div>

      {/* Step content — full height, scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {step === 1 && (
          <div className="bg-white border-[1.5px] border-cream-dark rounded-2xl mx-4 mt-4 overflow-hidden">
            <CartSummary onNext={() => setStep(2)} orderingDisabled={orderingDisabled} />
          </div>
        )}
        {step === 2 && (
          <div className="bg-white border-[1.5px] border-cream-dark rounded-2xl mx-4 mt-4 overflow-hidden">
            <CheckoutPanel
              onBack={() => setStep(1)}
              onBackToMenu={onBackToMenu}
              onOrderPlaced={handleOrderPlaced}
              orderingDisabled={orderingDisabled}
            />
          </div>
        )}
        {step === 3 && (
          <div className="bg-white border-[1.5px] border-cream-dark rounded-2xl mx-4 mt-4 overflow-hidden">
            <OrderConfirmation
              orderNum={orderNum}
              estimatedPickupTime={estimatedPickupTime}
              verification={orderVerification}
              onOrderAgain={handleOrderAgain}
            />
          </div>
        )}
      </div>
    </div>
  );
}
