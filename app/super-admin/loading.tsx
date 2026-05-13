export default function SuperAdminSegmentLoading() {
  return (
    <div className="max-w-[760px] space-y-8 animate-pulse" aria-busy="true">
      <div className="h-6 bg-teal/25 rounded-full w-48" />
      <div className="h-10 bg-charcoal/10 rounded-xl w-full max-w-md" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-36 bg-cream-dark/35 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
