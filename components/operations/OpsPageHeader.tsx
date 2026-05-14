type Props = {
  title: string;
  subtitle?: string;
  /** Defaults to Operations. Pass `false` to hide entirely. */
  eyebrow?: string | false;
  actions?: React.ReactNode;
};

export default function OpsPageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: Props) {
  const eyebrowText = eyebrow === false ? null : eyebrow ?? "Operations";
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-2">
        {eyebrowText ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-dark/90">{eyebrowText}</p>
        ) : null}
        <h1 className="font-display text-3xl text-charcoal tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="text-[15px] text-charcoal/70 max-w-[52ch] leading-relaxed">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
