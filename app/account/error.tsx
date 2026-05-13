"use client";

export default function AccountSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-xl space-y-4 rounded-2xl border border-red/25 bg-white/92 px-6 py-8">
      <h1 className="font-display text-2xl text-charcoal tracking-tight">Account unavailable</h1>
      <p className="text-[15px] text-charcoal/75 leading-relaxed">
        Something interrupted this page while loading account data. Please try again shortly.
      </p>
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
