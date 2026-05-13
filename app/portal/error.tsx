"use client";

export default function PortalSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-teal/20 bg-white/95 px-6 py-8 space-y-4">
      <h1 className="font-display text-2xl text-charcoal tracking-tight">Portal hiccup</h1>
      <p className="text-[15px] text-charcoal/72 leading-relaxed">{error.digest ?? error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-xl bg-teal-dark text-cream px-5 py-2.5 text-sm font-semibold hover:opacity-95"
      >
        Try again
      </button>
    </div>
  );
}
