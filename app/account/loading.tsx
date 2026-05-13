export default function AccountSegmentLoading() {
  return (
    <div className="max-w-[720px] space-y-6 animate-pulse" aria-busy="true">
      <div className="h-9 bg-cream-dark/45 rounded-xl w-52" />
      <div className="h-[180px] bg-cream-dark/30 rounded-2xl" />
      <div className="h-[120px] bg-cream-dark/25 rounded-2xl" />
    </div>
  );
}
