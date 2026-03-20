"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";

type CardInstance = {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: unknown[] }>;
  destroy: () => Promise<void>;
};

declare global {
  interface Window {
    Square?: {
      payments: (
        applicationId: string,
        locationId: string
      ) => {
        card: () => Promise<CardInstance>;
        paymentRequest: (config: {
          countryCode: string;
          currencyCode: string;
          total: { amount: string; label: string };
        }) => unknown;
        applePay: (paymentRequest: unknown) => Promise<{
          tokenize: () => Promise<{ status: string; token?: string; errors?: unknown[] }>;
        }>;
        googlePay: (paymentRequest: unknown) => Promise<{
          attach: (selector: string) => Promise<void>;
          tokenize: () => Promise<{ status: string; token?: string; errors?: unknown[] }>;
        }>;
      };
    };
  }
}

interface SquarePaymentFormProps {
  applicationId: string;
  locationId: string;
  environment: "sandbox" | "production";
  totalAmount: number;
  onReady?: (tokenize: () => Promise<string | null>) => void;
  onError?: (message: string) => void;
  onWalletToken?: (token: string) => void;
  placing?: boolean;
}

export default function SquarePaymentForm({
  applicationId,
  locationId,
  environment,
  totalAmount,
  onReady,
  onError,
  onWalletToken,
  placing = false,
}: SquarePaymentFormProps) {
  const [squareReady, setSquareReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [applePayReady, setApplePayReady] = useState(false);
  const [googlePayReady, setGooglePayReady] = useState(false);
  const tokenizeRef = useRef<() => Promise<string | null>>(() => Promise.resolve(null));
  const applePayRef = useRef<{ tokenize: () => Promise<{ status: string; token?: string }> } | null>(null);
  const googlePayRef = useRef<{ tokenize: () => Promise<{ status: string; token?: string }> } | null>(null);
  const cardRef = useRef<CardInstance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerIdRef = useRef<string>(`card-container-${Math.random().toString(36).slice(2, 11)}`);
  const googlePayContainerIdRef = useRef<string>(`google-pay-${Math.random().toString(36).slice(2, 11)}`);
  const initStartedRef = useRef(false);

  const containerId = containerIdRef.current;
  const googlePayContainerId = googlePayContainerIdRef.current;

  const tokenize = useCallback(async (): Promise<string | null> => {
    return tokenizeRef.current();
  }, []);

  const onReadyStable = useRef(onReady);
  onReadyStable.current = onReady;
  useEffect(() => {
    const fn = onReadyStable.current;
    if (typeof fn === "function") {
      fn(tokenize);
    }
  }, [tokenize]);

  // Single initialization: card only (no totalAmount dependency)
  useEffect(() => {
    if (!squareReady || !applicationId || !locationId || !window.Square) {
      if (!applicationId || !locationId) {
        setIsLoading(false);
      }
      return;
    }

    if (initStartedRef.current) return;
    initStartedRef.current = true;

    let cancelled = false;
    const initCard = async () => {
      try {
        const payments = window.Square!.payments(applicationId, locationId);
        const card = await payments.card();
        if (cancelled) return;

        await card.attach(`#${containerId}`);
        if (cancelled) return;

        cardRef.current = card;
        tokenizeRef.current = async () => {
          try {
            const result = await card.tokenize();
            if (result.status === "OK" && result.token) {
              return result.token;
            }
            const errMsg = Array.isArray(result.errors)
              ? (result.errors as { message?: string }[]).map((e) => e.message ?? "Invalid card").join(", ")
              : "Card validation failed";
            onError?.(errMsg);
            return null;
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Tokenization failed";
            onError?.(msg);
            return null;
          }
        };
      } catch (err) {
        if (!cancelled) {
          console.error("Square card init error:", err);
          onError?.("Could not load payment form. Please refresh and try again.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          initStartedRef.current = false;
        }
      }
    };
    initCard();

    return () => {
      cancelled = true;
      const card = cardRef.current;
      if (card) {
        card.destroy().catch(() => {});
        cardRef.current = null;
      }
      tokenizeRef.current = () => Promise.resolve(null);
    };
  }, [squareReady, applicationId, locationId, containerId, onError]);

  // Wallet buttons: separate effect, depends on totalAmount (can re-run when total changes)
  useEffect(() => {
    if (
      !squareReady ||
      !applicationId ||
      !locationId ||
      !window.Square ||
      totalAmount < 0.5 ||
      isLoading
    ) {
      return;
    }

    let cancelled = false;
    const initWallets = async () => {
      try {
        const payments = window.Square!.payments(applicationId, locationId);
        const paymentRequest = payments.paymentRequest?.({
          countryCode: "US",
          currencyCode: "USD",
          total: { amount: totalAmount.toFixed(2), label: "Total" },
        });
        if (!paymentRequest || cancelled) return;

        try {
          const applePay = await payments.applePay?.(paymentRequest);
          if (applePay && !cancelled) {
            applePayRef.current = applePay;
            setApplePayReady(true);
          }
        } catch {
          // Apple Pay not available
        }
        try {
          const googlePay = await payments.googlePay?.(paymentRequest);
          if (googlePay && !cancelled) {
            await googlePay.attach(`#${googlePayContainerId}`);
            googlePayRef.current = googlePay;
            setGooglePayReady(true);
          }
        } catch {
          // Google Pay not available
        }
      } catch {
        // Silent
      }
    };
    initWallets();

    return () => {
      cancelled = true;
      setApplePayReady(false);
      setGooglePayReady(false);
      applePayRef.current = null;
      googlePayRef.current = null;
    };
  }, [squareReady, applicationId, locationId, totalAmount, isLoading, googlePayContainerId]);

  const handleApplePay = useCallback(async () => {
    const ap = applePayRef.current;
    if (!ap || !onWalletToken || placing) return;
    try {
      const result = await ap.tokenize();
      if (result.status === "OK" && result.token) {
        onWalletToken(result.token);
      } else {
        onError?.("Apple Pay was cancelled or failed.");
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Apple Pay failed");
    }
  }, [onWalletToken, onError, placing]);

  const handleGooglePay = useCallback(async () => {
    const gp = googlePayRef.current;
    if (!gp || !onWalletToken || placing) return;
    try {
      const result = await gp.tokenize();
      if (result.status === "OK" && result.token) {
        onWalletToken(result.token);
      } else {
        onError?.("Google Pay was cancelled or failed.");
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Google Pay failed");
    }
  }, [onWalletToken, onError, placing]);

  const scriptUrl =
    environment === "production"
      ? "https://web.squarecdn.com/v1/square.js"
      : "https://sandbox.web.squarecdn.com/v1/square.js";

  return (
    <>
      <Script
        src={scriptUrl}
        strategy="afterInteractive"
        onLoad={() => setSquareReady(true)}
      />
      <div
        className={`flex flex-wrap gap-2 mb-3 ${!(applePayReady || googlePayReady) ? "hidden" : ""}`}
      >
        {applePayReady && (
          <button
            type="button"
            onClick={handleApplePay}
            disabled={placing || totalAmount < 0.5}
            className="flex-1 min-w-[120px] h-10 rounded-lg bg-black text-white flex items-center justify-center gap-1.5 font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Pay with Apple Pay"
          >
            <span className="text-lg">🍎</span> Apple Pay
          </button>
        )}
        <div
          id={googlePayContainerId}
          role="button"
          tabIndex={googlePayReady ? 0 : -1}
          onClick={handleGooglePay}
          onKeyDown={(e) => e.key === "Enter" && handleGooglePay()}
          className={`min-w-[120px] min-h-[40px] flex-1 rounded-lg flex items-center justify-center ${placing ? "pointer-events-none opacity-50" : "cursor-pointer"} ${!googlePayReady ? "hidden" : ""}`}
          aria-label="Pay with Google Pay"
        />
      </div>
      <div className="text-[11px] text-charcoal/60 mb-2">Or pay with card</div>
      <div
        ref={containerRef}
        id={containerId}
        className={`min-h-[45px] ${isLoading ? "animate-pulse bg-cream-dark/30 rounded-lg" : ""}`}
      />
    </>
  );
}
