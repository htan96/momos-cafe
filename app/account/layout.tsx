export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gold/[0.07] via-cream-dark/45 to-cream-dark/30 border-t-[3px] border-gold/65">
      {children}
    </div>
  );
}
