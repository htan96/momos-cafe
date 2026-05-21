import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow?: string;
  children?: ReactNode;
};

/**
 * Quiet empty / “not wired yet” surface for super-admin shells — Stripe/Linear-style hierarchy, no fabricated metrics.
 */
export default function SuperAdminEmptyPanel({ icon: Icon, title, description, eyebrow, children }: Props) {
  return (
    <div className="rounded-2xl border border-cream-dark/55 bg-white/[0.96] px-6 py-10 sm:px-8 sm:py-11 shadow-[0_1px_0_rgba(45,107,107,0.06),0_12px_32px_-20px_rgba(46,42,37,0.18)]">
      <div className="flex flex-col items-center text-center max-w-lg mx-auto">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-cream-dark/60 bg-cream-mid/25 text-teal-dark/90">
          <Icon className="h-5 w-5 stroke-[1.75]" aria-hidden />
        </span>
        {eyebrow ? (
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/40">{eyebrow}</p>
        ) : null}
        <h2 className={`font-display text-lg sm:text-xl text-teal-dark tracking-tight ${eyebrow ? "mt-1" : "mt-5"}`}>
          {title}
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-charcoal/60">{description}</p>
        {children ? <div className="mt-6 w-full flex flex-wrap justify-center gap-3">{children}</div> : null}
      </div>
    </div>
  );
}
