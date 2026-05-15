"use client";

import { useEffect, useState, type ReactNode } from "react";

export type PageLoadPhase = "loading" | "error" | "ready";

type PageLoadBoundaryProps = {
  phase: PageLoadPhase;
  onRetry?: () => void;
  errorMessage?: string;
  /** After this many ms in loading, show a gentle “still working” row with retry. */
  stallHintAfterMs?: number;
  skeleton: ReactNode;
  children: ReactNode;
};

/**
 * Branded loading shell: bounded wait hint + explicit retry instead of an indefinite spinner.
 */
export default function PageLoadBoundary({
  phase,
  onRetry,
  errorMessage = "We couldn’t load this right now.",
  stallHintAfterMs = 10_000,
  skeleton,
  children,
}: PageLoadBoundaryProps) {
  const [showStallHint, setShowStallHint] = useState(false);

  useEffect(() => {
    if (phase !== "loading") {
      setShowStallHint(false);
      return;
    }
    const t = window.setTimeout(() => setShowStallHint(true), stallHintAfterMs);
    return () => window.clearTimeout(t);
  }, [phase, stallHintAfterMs]);

  if (phase === "ready") {
    return <>{children}</>;
  }

  if (phase === "error") {
    return (
      <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-sm rounded-2xl border border-cream-dark bg-white p-8 shadow-sm space-y-5 text-center">
          <p className="text-sm font-semibold text-charcoal">{errorMessage}</p>
          <p className="text-[13px] text-charcoal/60 leading-relaxed">
            Check your connection, then try again. Menu ordering needs a quick load from our kitchen catalog.
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="w-full rounded-xl bg-teal-dark py-3 text-sm font-semibold uppercase tracking-wider text-white hover:opacity-95 active:opacity-90"
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {skeleton}
      {showStallHint && onRetry ? (
        <div className="fixed bottom-24 left-0 right-0 z-[850] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex max-w-md flex-col gap-2 rounded-2xl border border-cream-dark bg-white/95 px-4 py-3 text-center shadow-lg backdrop-blur-sm">
            <p className="text-[12px] font-medium text-charcoal/80">Still loading — tap retry if this sits too long.</p>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg bg-teal-dark py-2 text-xs font-semibold uppercase tracking-wider text-white"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
