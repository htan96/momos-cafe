export default function AdminSegmentLoading() {
  return (
    <div className="max-w-[760px] space-y-8 animate-pulse" aria-busy="true">
      <div className="h-6 bg-red/15 rounded-full w-40" />
      <div className="h-10 bg-charcoal/10 rounded-xl w-full max-w-md" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-36 bg-cream-dark/35 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
