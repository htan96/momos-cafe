"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";

declare global {
  interface Window {
    Square?: {
      payments: (
        applicationId: string,
        locationId: string
      ) => {
        card: () => Promise<{
          attach: (selector: string) => Promise<void>;
          tokenize: () => Promise<{ status: string; token?: string; errors?: unknown[] }>;
        }>;
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
  const [isLoading, setIsLoading] = useState(true);
  const [applePayReady, setApplePayReady] = useState(false);
  const [googlePayReady, setGooglePayReady] = useState(false);
  const tokenizeRef = useRef<() => Promise<string | null>>(() => Promise.resolve(null));
  const applePayRef = useRef<{ tokenize: () => Promise<{ status: string; token?: string }> } | null>(null);
  const googlePayRef = useRef<{ tokenize: () => Promise<{ status: string; token?: string }> } | null>(null);

  const tokenize = useCallback(async (): Promise<string | null> => {
    return tokenizeRef.current();
  }, []);

  useEffect(() => {
    if (typeof onReady === "function") {
      onReady(tokenize);
    }
  }, [onReady, tokenize]);

  const buildPaymentRequest = useCallback(
    (payments: ReturnType<typeof window.Square>["payments"]) => {
      if (!payments?.paymentRequest) return null;
      return payments.paymentRequest({
        countryCode: "US",
        currencyCode: "USD",
        total: {
          amount: totalAmount.toFixed(2),
          label: "Total",
        },
      });
    },
    [totalAmount]
  );

  const initPayments = useCallback(async () => {
    if (!applicationId || !locationId || !window.Square) {
      setIsLoading(false);
      return;
    }

    try {
      const payments = window.Square.payments(applicationId, locationId);
      const card = await payments.card();
      await card.attach("#card-container");
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

      const paymentRequest = buildPaymentRequest(payments);
      if (paymentRequest && totalAmount >= 0.5) {
        try {
          const applePay = await payments.applePay?.(paymentRequest);
          if (applePay) {
            applePayRef.current = applePay;
            setApplePayReady(true);
          }
        } catch {
          // Apple Pay not available (browser, device, or domain)
        }
        try {
          const googlePay = await payments.googlePay?.(paymentRequest);
          if (googlePay) {
            await googlePay.attach("#google-pay-button-container");
            googlePayRef.current = googlePay;
            setGooglePayReady(true);
          }
        } catch {
          // Google Pay not available
        }
      }
    } catch (err) {
      console.error("Square card init error:", err);
      onError?.("Could not load payment form. Please refresh and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [applicationId, locationId, onError, buildPaymentRequest, totalAmount]);

  useEffect(() => {
    if (window.Square && applicationId && locationId) {
      initPayments();
    } else if (!applicationId || !locationId) {
      setIsLoading(false);
    }
  }, [initPayments, applicationId, locationId]);

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
        onLoad={() => {
          if (applicationId && locationId) initPayments();
        }}
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
          id="google-pay-button-container"
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
        id="card-container"
        className={`min-h-[45px] ${isLoading ? "animate-pulse bg-cream-dark/30 rounded-lg" : ""}`}
      />
    </>
  );
}
