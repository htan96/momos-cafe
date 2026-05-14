type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export default function GovPageHeader({ eyebrow, title, subtitle, actions }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-dark/85">{eyebrow}</p>
        <h1 className="font-display text-2xl md:text-[clamp(1.5rem,2.6vw,1.85rem)] text-charcoal tracking-tight">
          {title}
        </h1>
        {subtitle ? <p className="text-[14px] text-charcoal/70 leading-relaxed max-w-2xl pt-0.5">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 justify-start sm:justify-end">{actions}</div> : null}
    </div>
  );
}
