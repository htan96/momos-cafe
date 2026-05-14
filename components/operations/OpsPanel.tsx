type Props = {
  title?: string;
  description?: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
};

/** Bordered operational card — calm surface for grids. */
export default function OpsPanel({ title, description, eyebrow, children, className = "", pad = true }: Props) {
  return (
    <section
      className={`rounded-2xl border border-cream-dark/90 bg-white/[0.93] shadow-sm ${pad ? "p-5 md:p-6" : ""} ${className}`}
    >
      {(title ?? description ?? eyebrow) ? (
        <div className={`space-y-1.5 ${title || eyebrow ? "mb-5" : ""}`}>
          {eyebrow ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/45">{eyebrow}</p>
          ) : null}
          {title ? <h2 className="font-display text-lg text-charcoal tracking-tight">{title}</h2> : null}
          {description ? (
            <p className="text-[13px] text-charcoal/65 leading-relaxed max-w-prose">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}    </section>
  );
}
