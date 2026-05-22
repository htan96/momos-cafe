/** Minimal shell while `/admin/orders` loaders resolve — keeps layout stable vs. flashes. */

export default function AdminOrdersLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy aria-live="polite">
      <div className="h-24 rounded-xl border border-cream-dark/65 bg-white/72" />
      <div className="h-[220px] rounded-xl border border-cream-dark/55 bg-white/72" />
    </div>
  );
}
