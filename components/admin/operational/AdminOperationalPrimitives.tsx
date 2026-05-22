import Link from "next/link";
import type { ReactNode } from "react";

export function OperationalActionCard(props: {
  href: string;
  title: string;
  subtitle: string;
  count: number;
  infoAriaLabel?: string;
}) {
  const { href, title, subtitle, count, infoAriaLabel } = props;
  return (
    <Link
      href={href}
      className="block rounded-xl border border-cream-dark/70 bg-white/90 hover:border-teal-dark/35 transition-colors p-4 shadow-[0_1px_2px_rgb(41_53_61/0.04)]"
    >
      <div className="flex justify-between gap-3 items-start">
        <div className="min-w-0">
          <div className="flex items-start gap-1.5 flex-wrap">
            <p className="font-display text-[15px] text-teal-dark leading-snug">{title}</p>
            {infoAriaLabel ?
              <span
                tabIndex={0}
                role="img"
                className="shrink-0 select-none rounded-full border border-cream-dark/70 bg-cream/50 px-[5px] text-[11px] font-semibold text-charcoal/45 hover:text-charcoal/70 outline-offset-2"
                title={infoAriaLabel}
                aria-label={infoAriaLabel}
              >
                i
              </span>
            : null}
          </div>
          <p className="text-[12px] text-charcoal/70 mt-1">{subtitle}</p>
        </div>
        <p className="font-display text-2xl text-charcoal tabular-nums shrink-0">{count}</p>
      </div>
    </Link>
  );
}

export function OptionalPreviewPlaceholder({
  title,
  subtitle,
  body,
}: {
  title: string;
  subtitle: string;
  body: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-cream-dark/70 bg-white/55 p-4">
      <div className="flex justify-between gap-3 items-start">
        <div>
          <p className="font-display text-[15px] text-charcoal">{title}</p>
          <p className="text-[12px] text-charcoal/70 mt-1">{subtitle}</p>
        </div>
      </div>
      <div className="mt-3">{body}</div>
    </div>
  );
}
