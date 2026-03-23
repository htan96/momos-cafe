"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import Script from "next/script";

const DEBUG_SQUARE = process.env.NODE_ENV === "development";

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

interface SquarePaymentFormInnerProps extends Omit<SquarePaymentFormProps, "onReady" | "onError" | "onWalletToken"> {
  onReadyRef: React.MutableRefObject<SquarePaymentFormProps["onReady"] | undefined>;
  onErrorRef: React.MutableRefObject<SquarePaymentFormProps["onError"] | undefined>;
  onWalletTokenRef: React.MutableRefObject<SquarePaymentFormProps["onWalletToken"] | undefined>;
}

function SquarePaymentFormInner({
  applicationId,
  locationId,
  environment,
  totalAmount,
  onReadyRef,
  onErrorRef,
  onWalletTokenRef,
  placing = false,
}: SquarePaymentFormInnerProps) {
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
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  useEffect(() => {
    if (DEBUG_SQUARE) console.log("[SquarePaymentForm] mount, renderCount:", renderCountRef.current, "appId:", !!applicationId, "locId:", !!locationId);
    return () => {
      if (DEBUG_SQUARE) console.log("[SquarePaymentForm] unmount");
    };
  }, [applicationId, locationId]);

  const tokenize = useCallback(async (): Promise<string | null> => {
    return tokenizeRef.current();
  }, []);

  useEffect(() => {
    const fn = onReadyRef.current;
    if (typeof fn === "function") {
      fn(tokenize);
    }
  }, [tokenize]);

  // Single initialization: card only (no totalAmount dependency)
  useEffect(() => {
    if (DEBUG_SQUARE) console.log("[SquarePaymentForm] card effect run", { squareReady, hasSquare: !!window.Square, applicationId: !!applicationId, locationId, containerId, initStarted: initStartedRef.current });

    if (!squareReady || !applicationId || !locationId || !window.Square) {
      if (DEBUG_SQUARE && (!applicationId || !locationId)) console.log("[SquarePaymentForm] skipping init: missing credentials or square not ready");
      if (!applicationId || !locationId) {
        setIsLoading(false);
      }
      return;
    }

    if (initStartedRef.current) {
      if (DEBUG_SQUARE) console.log("[SquarePaymentForm] skipping init: already started (StrictMode double-run?)");
      return;
    }
    initStartedRef.current = true;
    if (DEBUG_SQUARE) console.log("[SquarePaymentForm] calling payments.card()...");

    let cancelled = false;
    const initCard = async () => {
      try {
        const payments = window.Square!.payments(applicationId, locationId);
        const card = await payments.card();
        if (cancelled) {
          if (DEBUG_SQUARE) console.log("[SquarePaymentForm] card() returned but cancelled (cleanup ran)");
          return;
        }
        if (DEBUG_SQUARE) console.log("[SquarePaymentForm] payments.card() done, calling card.attach(#" + containerId + ")...");

        await card.attach(`#${containerId}`);
        if (cancelled) {
          if (DEBUG_SQUARE) console.log("[SquarePaymentForm] attach() done but cancelled");
          return;
        }

        if (DEBUG_SQUARE) console.log("[SquarePaymentForm] card.attach() completed, containerId:", containerId);
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
            onErrorRef.current?.(errMsg);
            return null;
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Tokenization failed";
            onErrorRef.current?.(msg);
            return null;
          }
        };
      } catch (err) {
        if (!cancelled) {
          console.error("Square card init error:", err);
          onErrorRef.current?.("Could not load payment form. Please refresh and try again.");
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
      if (DEBUG_SQUARE) console.log("[SquarePaymentForm] card effect cleanup");
      cancelled = true;
      initStartedRef.current = false;
      const card = cardRef.current;
      if (card) {
        card.destroy().catch(() => {});
        cardRef.current = null;
      }
      tokenizeRef.current = () => Promise.resolve(null);
    };
  }, [squareReady, applicationId, locationId, containerId]);

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
    if (!ap || !onWalletTokenRef.current || placing) return;
    try {
      const result = await ap.tokenize();
      if (result.status === "OK" && result.token) {
        onWalletTokenRef.current?.(result.token);
      } else {
        onErrorRef.current?.("Apple Pay was cancelled or failed.");
      }
    } catch (err) {
      onErrorRef.current?.(err instanceof Error ? err.message : "Apple Pay failed");
    }
  }, [placing]);

  const handleGooglePay = useCallback(async () => {
    const gp = googlePayRef.current;
    if (!gp || !onWalletTokenRef.current || placing) return;
    try {
      const result = await gp.tokenize();
      if (result.status === "OK" && result.token) {
        onWalletTokenRef.current?.(result.token);
      } else {
        onErrorRef.current?.("Google Pay was cancelled or failed.");
      }
    } catch (err) {
      onErrorRef.current?.(err instanceof Error ? err.message : "Google Pay failed");
    }
  }, [placing]);

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

const MemoizedSquarePaymentFormInner = memo(SquarePaymentFormInner, (prev, next) => {
  return (
    prev.applicationId === next.applicationId &&
    prev.locationId === next.locationId &&
    prev.environment === next.environment &&
    prev.totalAmount === next.totalAmount &&
    prev.placing === next.placing
  );
});

export default function SquarePaymentForm({
  onReady,
  onError,
  onWalletToken,
  ...rest
}: SquarePaymentFormProps) {
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const onWalletTokenRef = useRef(onWalletToken);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;
  onWalletTokenRef.current = onWalletToken;
  return (
    <MemoizedSquarePaymentFormInner
      {...rest}
      onReadyRef={onReadyRef}
      onErrorRef={onErrorRef}
      onWalletTokenRef={onWalletTokenRef}
    />
  );
}
