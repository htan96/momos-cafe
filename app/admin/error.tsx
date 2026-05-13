"use client";

export default function AdminSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-xl space-y-4 rounded-2xl border border-charcoal/10 bg-white/95 px-6 py-8">
      <h1 className="font-display text-2xl text-charcoal tracking-tight">Staff console stalled</h1>
      <p className="text-[15px] text-charcoal/75 leading-relaxed">{error.digest ?? error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-xl bg-red text-white px-5 py-2.5 text-sm font-semibold hover:bg-red-dark transition-colors"
      >
        Reload section
      </button>
    </div>
  );
}
