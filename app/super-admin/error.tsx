"use client";

export default function SuperAdminSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-xl space-y-4 rounded-2xl border border-teal/25 bg-white/96 px-6 py-8">
      <h1 className="font-display text-2xl text-teal-dark tracking-tight">Super admin surface failed</h1>
      <p className="text-[15px] text-charcoal/75 leading-relaxed">{error.digest ?? error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-xl bg-teal-dark text-cream px-5 py-2.5 text-sm font-semibold hover:opacity-95"
      >
        Retry
      </button>
    </div>
  );
}
