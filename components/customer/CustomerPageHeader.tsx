import type { ReactNode } from "react";

export default function CustomerPageHeader({
  eyebrow,
  title,
  subtitle,
  aside,
  illustrationAccentClassName,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  aside?: ReactNode;
  /** Optional decorative accent (e.g. gradient orb) — purely presentational. */
  illustrationAccentClassName?: string;
}) {
  return (
    <header className="relative mb-10 md:mb-12 overflow-hidden rounded-2xl border border-gold/25 bg-cream/55 px-6 py-8 md:px-8 md:py-10">
      {illustrationAccentClassName ? (
        <div
          className={`pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full blur-3xl opacity-70 ${illustrationAccentClassName}`}
          aria-hidden
        />
      ) : null}
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-teal-dark">{eyebrow}</p>
          ) : null}
          <h1 className="mt-2 font-display text-3xl md:text-[clamp(2rem,4vw,2.75rem)] text-charcoal tracking-tight leading-[1.08]">
            {title}
          </h1>
          {subtitle ? <div className="mt-3 text-[15px] text-charcoal/72 leading-relaxed">{subtitle}</div> : null}
        </div>
        {aside ? <div className="shrink-0 lg:text-right">{aside}</div> : null}
      </div>
    </header>
  );
}
