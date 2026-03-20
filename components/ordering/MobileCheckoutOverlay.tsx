"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
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
  const { clearCart } = useCart();

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setOrderNum("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOrderPlaced = (num: string) => {
    setOrderNum(num);
    setStep(3);
    clearCart();
  };

  const handleOrderAgain = () => {
    setOrderNum("");
    setStep(1);
    onClose();
  };

  const handleBackFromStep1 = () => {
    onClose();
  };

  return (
    <div
      className="lg:hidden fixed inset-0 z-[900] bg-cream flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
    >
      {/* Header with step title and back */}
      <div className="bg-teal-dark px-4 py-4 flex items-center justify-between border-b-2 border-gold flex-shrink-0">
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
      <div className="flex-1 overflow-y-auto">
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
            <OrderConfirmation orderNum={orderNum} onOrderAgain={handleOrderAgain} />
          </div>
        )}
      </div>
    </div>
  );
}
