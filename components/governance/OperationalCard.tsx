type Props = {
  title: string;
  meta?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export default function OperationalCard({ title, meta, children, footer, className = "" }: Props) {
  return (
    <section
      className={`rounded-2xl border border-cream-dark/70 bg-white/[0.94] shadow-[0_1px_0_rgba(45,107,107,0.06),0_12px_32px_-18px_rgba(46,42,37,0.18)] ${className}`}
    >
      <header className="border-b border-cream-dark/55 px-5 py-4 md:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg text-teal-dark tracking-tight">{title}</h2>
          {meta ? <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-charcoal/45">{meta}</p> : null}
        </div>
      </header>
      <div className="px-5 py-4 md:px-6 md:py-5">{children}</div>
      {footer ? (
        <footer className="border-t border-cream-dark/50 px-5 py-3 md:px-6 bg-cream-mid/25 rounded-b-2xl">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
