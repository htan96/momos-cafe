export default function PortalSegmentLoading() {
  return (
    <div className="max-w-[560px] space-y-6 animate-pulse" aria-busy="true">
      <div className="h-8 bg-cream-dark/40 rounded-xl w-full" />
      <div className="h-[140px] bg-cream-dark/25 rounded-2xl" />
    </div>
  );
}
