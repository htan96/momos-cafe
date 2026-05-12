export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-dark/35 border-t-[3px] border-gold/60">
      {children}
    </div>
  );
}
